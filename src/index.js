import express from 'express'
import pg from 'pg'
import joi from 'joi'

const app = express()
const PORT = process.env.PORT || 4000

const { Pool } = pg

const connection = new Pool({
    host: 'localhost',
    user: 'postgres',
    password: '33150602',
    database: 'boardcamp',
    port: 5432
})
app.use(express.json())

app.get('/alive', (req,res) => {
    res.send("I'm alive!!!")
})

app.get('/categories', (req,res) => {
    connection.query('SELECT * FROM categories')
    .then(result => {
        res.send(result.rows)
    })
    .catch(err => {
        console.log(err);
        res.sendStatus(400)
    })
})

app.post('/categories', (req,res) => {
    const name = req.body.name

    const categSchema = joi.object({
        name: joi.string()
                .min(3)
                .required()
    })

    const {error} = categSchema.validate({name: name})
    if (error) {
        res.status(400).send(error.details[0].message)
        return
    }

    connection.query(`SELECT name FROM categories WHERE name=$1`,[name])
    .then(result => {
        if (result.rowCount !== 0) {
            res.status(409).send('category already exists')
            return
        }

        connection.query('INSERT INTO categories (name) VALUES ($1)',[name])
        .then(result2 => {
            res.send(result2.rows)
        })
        .catch(err => {
            console.log(err);
            res.sendStatus(400)
        })
    })
    .catch(err => console.log(err))
})

app.listen(PORT, () => console.log(`Listening on port ${PORT}`))