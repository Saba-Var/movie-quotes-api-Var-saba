import { changeUserSchema, passwordSchema, idSchema } from 'schemas'
import { validateRequestSchema } from 'middlewares'
import express, { RequestHandler } from 'express'
import { uploadUserImage } from 'utils'
import {
  changeUserCredentials,
  changePassword,
  getUserDetails,
  uploadUserImg,
} from 'controllers'

const router = express.Router()

router.get('/user-details', getUserDetails)

router.post(
  '/change-password',
  passwordSchema,
  validateRequestSchema,
  changePassword as RequestHandler
)

router.patch(
  '/upload-user-image',
  uploadUserImage,
  idSchema,
  validateRequestSchema,
  uploadUserImg
)

router.put(
  '/change-user-credentials',
  idSchema,
  changeUserSchema,
  validateRequestSchema,
  changeUserCredentials
)

export default router
