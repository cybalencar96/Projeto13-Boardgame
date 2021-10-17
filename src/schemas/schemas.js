import joi from 'joi'

const categSchema = joi.object({
    name: joi.string()
            .min(3)
            .required()
})

const postCustomerSchema = joi.object({
    name: joi.string().required().min(1),
    phone: joi.string().required().min(10).max(11),
    cpf: joi.string().min(11).max(11).required(),
    birthday: joi.date().required(),
})

const postGameSchema = joi.object({
    name: joi.string().required(),
    image: joi.string().required(),
    stockTotal: joi.number().min(1),
    categoryId: joi.number().min(1),
    pricePerDay: joi.number()
})

const postRentalSchema = joi.object({
    customerId: joi.number().min(1).required(),
    gameId: joi.number().min(1).required(),
    daysRented: joi.number().min(1).required(),
})

export {
    postCustomerSchema,
    postGameSchema,
    categSchema,
    postRentalSchema

}