import { RequestBody, Response, QueryId } from 'types.d'
import { Quote, Movie, QuoteModel, User } from 'models'
import { ChangeQuoteReq } from './types.d'
import { deleteFile } from 'utils'
import mongoose from 'mongoose'
import fs from 'fs'

export const addQuote = async (req: RequestBody<QuoteModel>, res: Response) => {
  try {
    const { movieId, quoteEn, quoteGe, user } = req.body

    if (!req.file) {
      return res.status(422).json({ message: 'Upload quote image' })
    }

    const imagePathDb = `images/quotes/${req.file?.filename}`

    const existingQuoteEn = await Quote.findOne({ quoteEn })
    const existingQuoteGe = await Quote.findOne({ quoteGe })

    const currentUser = User.findById(user)

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (existingQuoteEn || existingQuoteGe) {
      if (fs.existsSync(`public/${imagePathDb}`)) {
        deleteFile(`public/${imagePathDb}`)
      }
      return res.status(409).json({ message: 'Quote is already added' })
    }

    const currentMovie = await Movie.findById(movieId).select('-_id')

    if (currentMovie) {
      const newQuote = await Quote.create({
        quoteEn,
        quoteGe,
        movieId,
        user,
      })

      newQuote.image = imagePathDb

      await newQuote.save()

      await Movie.findByIdAndUpdate(movieId, {
        $push: {
          quotes: {
            _id: new mongoose.Types.ObjectId(newQuote._id),
          },
        },
      })

      return res.status(201).json(newQuote)
    }

    return res.status(404).json({ message: 'Movie not found' })
  } catch (error: any) {
    return res.status(500).json({ message: error.message })
  }
}

export const deleteQuote = async (req: QueryId, res: Response) => {
  try {
    const id = { _id: new mongoose.Types.ObjectId(req.query.id) }

    const quote = await Quote.findOne(id)

    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' })
    }

    if (quote.image) {
      deleteFile(`public/${quote.image}`)
    }

    await Movie.updateOne(
      { quotes: id },
      {
        $pull: {
          quotes: new mongoose.Types.ObjectId(quote.id),
        },
      }
    )

    await Quote.deleteOne(id)

    return res.status(200).json({
      message: 'quote deleted successfully',
    })
  } catch (error: any) {
    return res.status(422).json({ message: 'Enter valid id' })
  }
}

export const changeQuote = async (
  req: RequestBody<ChangeQuoteReq>,
  res: Response
) => {
  try {
    const { id, quoteEn, quoteGe } = req.body

    const existingQuote = await Quote.findById(id).select('-movieId')

    if (!existingQuote) {
      return res.status(404).json({ message: 'Quote not found' })
    }

    if (req.file) {
      if (fs.existsSync(`public/${existingQuote.image}`)) {
        deleteFile(`public/${existingQuote.image}`)
      }
      existingQuote.image = `images/quotes/${req.file?.filename}`
    }

    existingQuote.quoteEn = quoteEn
    existingQuote.quoteGe = quoteGe
    await existingQuote.save()

    return res.status(200).json(existingQuote)
  } catch (error: any) {
    return res.status(409).json({ message: 'This quote is already added' })
  }
}
