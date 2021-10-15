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

app.get('/categories', async (req,res) => {
    try {
        const result = await connection.query('SELECT * FROM categories')
        res.send(result.rows)
    }
    catch {
        console.log(err);
        res.sendStatus(400)
    }
})

app.post('/categories', async (req,res) => {
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

    try {
        const result = await connection.query(`SELECT name FROM categories WHERE name=$1`,[name])
        if (result.rowCount !== 0) {
            res.status(409).send('category already exists')
            return
        }
        await connection.query('INSERT INTO categories (name) VALUES ($1)',[name])
        res.sendStatus(201)
    }
    catch (err) {
        console.log(err);
        res.sendStatus(400)
    }
})

app.get('/games', async (req,res) => {
    const name = req.query.name
    
    try {
        let result;
        if (name) {
            const uppName = name.toUpperCase() + '%'
            result = await connection.query("SELECT * FROM games WHERE name LIKE $1",[uppName])
        } else {
            result = await connection.query('SELECT * FROM games;')
        }
        if (!result.rowCount) {
            res.sendStatus(404)
            return
        }
        res.send(result.rows)
        return
    }
    catch (err) {
        console.log(err);
        res.sendStatus(400)
    }
})

app.post('/games', async (req, res) => {
    const { 
        name, 
        image, 
        stockTotal, 
        categoryId, 
        pricePerDay
    } = req.body

    const postGameSchema = joi.object({
        name: joi.string().required(),
        image: joi.string().required(),
        stockTotal: joi.number().min(1),
        categoryId: joi.number().min(1),
        pricePerDay: joi.number()
    })

    const { error } = postGameSchema.validate({
        name,
        image,
        stockTotal,
        categoryId,
        pricePerDay
    })

    if (error) {
        res.status(400).send(error.details[0].message)
        return
    }

    try {
        const existsCategoryId = await connection.query('SELECT * FROM categories WHERE id = $1',[categoryId])

        if (!existsCategoryId.rowCount) {
            res.status(400).send('Category Id not found')
            return
        }

        const existsGameName = await connection.query('SELECT * FROM games WHERE name = $1',[name])
        if (!!existsGameName.rowCount) {
            res.status(400).send('Game name in use')
            return
        }

        await connection.query('INSERT INTO games (name, image, "stockTotal","categoryId","pricePerDay") VALUES ($1,$2,$3,$4,$5)',[name.toUpperCase(), image, stockTotal,categoryId,pricePerDay])

        res.sendStatus(200)
    }
    catch (err) {
        console.log(err)
        res.sendStatus(500)
    }
})

app.listen(PORT, () => console.log(`Listening on port ${PORT}`))