import { RequestBody, Response, RequestQuery } from 'types.d'
import jwt_decode from 'jwt-decode'
import sgMail from '@sendgrid/mail'
import jwt from 'jsonwebtoken'
import { User } from 'models'
import bcrypt from 'bcryptjs'
import path from 'path'
import fs from 'fs'
import {
  RegisterGoogleMemberReq,
  EmailActivationReq,
  RegisterMemberReq,
  Email,
} from './types.d'

const emailTemplate = fs.readFileSync(
  path.join(__dirname, '..', 'views', 'email-template.html'),
  'utf-8'
)

export const registerUser = async (
  req: RequestBody<RegisterMemberReq>,
  res: Response
) => {
  try {
    const { name, email, password } = req.body

    if (!/^[a-z0-9]+$/g.test(name) || !/^[a-z0-9]+$/g.test(password)) {
      return res
        .status(422)
        .json({ message: 'Credentials should include lowercase characters!' })
    }

    const existingUser = await User.findOne({ email })

    if (existingUser) {
      return res.status(409).json({ message: `User is already registered!` })
    }

    if (process.env.SENGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENGRID_API_KEY)

      const emailToken = jwt.sign({ email }, process.env.JWT_SECRET!)

      let newEmailTemp = emailTemplate

      newEmailTemp = newEmailTemp.replace(
        /{% uri %}/g,
        `${process.env.FRONTEND_URI}/?token=${emailToken}`
      )
      newEmailTemp = newEmailTemp.replace(/{% verify-object %}/g, 'account')
      newEmailTemp = newEmailTemp.replace('{% user-name %}', name)

      await sgMail.send(
        {
          to: email,
          from: 'vartasashvili94@gmail.com',
          subject: 'Account verification',
          html: newEmailTemp,
        },
        false,
        async (err: any) => {
          if (err) {
            return res.status(500).json({
              message: 'User registration failed! Email could not be sent.',
            })
          }

          const hashedPassword = await bcrypt.hash(password, 12)
          await User.create({ name, email, password: hashedPassword })

          return res.status(201).json({
            message:
              'User registered successfully! Account verification link sent.',
          })
        }
      )
    } else {
      return res.status(401).json({ message: 'Sendgrid api key is missing!' })
    }
  } catch (error: any) {
    return res.status(500).json({ message: error.message })
  }
}

export const registerUserWithGoogle = async (
  req: RequestBody<RegisterGoogleMemberReq>,
  res: Response
) => {
  try {
    const { name, email } = req.body

    const existingUser = await User.findOne({ email })

    const token = jwt.sign({ email }, process.env.JWT_SECRET!)

    if (!existingUser) {
      const newUser = await User.create({ name, email })

      newUser.verified = true

      await newUser.save()
    }

    return res.status(200).json({
      token,
    })
  } catch (error: any) {
    return res.status(500).json({ message: error.message })
  }
}

export const userAccountActivation = async (
  req: RequestQuery<EmailActivationReq>,
  res: Response
) => {
  try {
    const { token } = req.query

    const verified = jwt.verify(token, process.env.JWT_SECRET!)

    if (verified) {
      let decodedToken = jwt_decode<Email>(token)

      let userEmil = decodedToken.email

      const existingUser = await User.findOne({ email: userEmil })

      if (!existingUser) {
        return res.status(404).json({ message: `User is not registered yet!` })
      }

      await User.updateOne({ email: userEmil }, { verified: true })

      return res.status(200).json({
        message: 'Account activated successfully!',
      })
    }
  } catch (error: any) {
    return res.status(403).json({
      message: 'Account activation failed. JWT token is invalid!',
    })
  }
}
