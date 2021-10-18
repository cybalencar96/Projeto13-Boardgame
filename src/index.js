import express from 'express'
import pg from 'pg'
import joi from 'joi'
import dayjs from 'dayjs'
import { 
    postCustomerSchema,
    postGameSchema,
    categSchema,
    postRentalSchema
} from './schemas/schemas.js'

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
    const { offset, limit } = req.query
    try {
        const query = `
            SELECT * FROM categories
            ${limit ? "LIMIT $1": ""}
            ${offset ? "OFFSET $2" : ""}
        `

        const params = []
        limit && params.push(limit)
        offset && params.push(offset)

        const result = await connection.query(query,params)
        res.send(result.rows)
    }
    catch (err) {
        console.log(err);
        res.sendStatus(400)
    }
})

app.post('/categories', async (req,res) => {
    const name = req.body.name

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
    const {name, limit, offset} = req.query
    let count = 1;
    try {
        
        let query = `SELECT * FROM games`
        const params = []
        
        if (name) {
            query = query +  " WHERE name LIKE $" + count
            count++
            params.push(name.toUpperCase() + '%')
        }

        if (limit) {
            query = query +  " LIMIT $" + count
            count++
            params.push(limit)
        }

        if (offset) {
            query = query +  " OFFSET $" + count
            params.push(offset)
        }

        console.log(query)

        const result = await connection.query(query,params);
        
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

app.get('/customers', async (req,res) => {
    const { cpf, limit, offset } = req.query
    
    let query = 'SELECT * FROM customers'
    let count = 1;
    const params = []

    if (cpf) {
        query = query + ' WHERE cpf LIKE $' + count
        count++
        params.push(cpf + '%')
    }

    if (limit) {
        query = query + ' LIMIT $' + count
        count++
        params.push(limit)
    }

    if (offset) {
        query = query + ' OFFSET $' + count
        count++
        params.push(offset)
    }

    console.log(query)
    try {
        const result = await connection.query(query, params)
        res.send(result.rows)
    } 
    catch (err) {
        console.log(err)
        res.sendStatus(500)
        return
    }
})

app.get('/customers/:id', async (req,res) => {
    const { id } = req.params
    
    try {
        const result = await connection.query(`SELECT * FROM customers WHERE id = $1`,[id])
        if (!result.rows[0]) {
            res.sendStatus(404)
            return
        }
        res.send(result.rows[0])
    } 
    catch (err) {
        console.log(err)
        res.sendStatus(500)
        return
    }
})

app.post('/customers', async (req,res) => {
    const {
        name,
        phone,
        cpf,
        birthday
    } = req.body

    const {error} = postCustomerSchema.validate(req.body)
    if (error) {
        res.status(400).send(error.details[0].message)
        return
    }

    try {
        const existingCpf = await connection.query(`SELECT * FROM customers WHERE cpf = $1`, [cpf])
        if (!!existingCpf.rowCount) {
            res.status(409).send('cpf existente')
            return
        }
        await connection.query('INSERT INTO customers (name,phone,cpf,birthday) VALUES ($1,$2,$3,$4)',[name,phone,cpf,birthday])
        res.send(201)
    }
    catch (err){
        console.log(err)
        res.sendStatus(500)
    }
})

app.put('/customers/:id', async (req,res) => {
    const {
        name,
        phone,
        cpf,
        birthday
    } = req.body

    const { id } = req.params

    const { error } = postCustomerSchema.validate(req.body)
    if (error) {
        res.status(400).send(error.details[0].message)
        return
    }

    try {
        const customer = await connection.query('SELECT * FROM customers WHERE id = $1',[id])
        if (!customer.rows[0]) {
            res.sendStatus(404)
            return
        }

        const existingCpf = await connection.query(`
            SELECT * 
            FROM customers 
            WHERE 
                cpf = $1 AND
                id <> $2
        `,[cpf,id])

        if (!!existingCpf.rowCount && existingCpf.rows[0]) {
            res.sendStatus(409)
            return
        } 

        await connection.query(`
            UPDATE customers 
             SET 
                name = $1, 
                phone = $2, 
                cpf = $3, 
                birthday = $4 
            WHERE id = $5;
        `,[name,phone,cpf,birthday,id])

        res.sendStatus(200)
    }
    catch (err) {
        console.log(err)
        res.sendStatus(500)
    }
})

app.get('/rentals', async (req,res) => {
    const { customerId, gameId, limit, offset } = req.query

    const params = []
    let count = 1;
    let query = `
    SELECT 
        rentals.*, 
        customers.name AS "customerName",
        games.name AS "gameName",
        games."categoryId", 
        categories.name AS "categoryName" 
    FROM customers 
    JOIN rentals 
        ON customers.id = rentals."customerId" 
    JOIN games 
        ON games.id = rentals."gameId" 
    JOIN categories ON games."categoryId" = categories.id`

    if (customerId || gameId) {
        query = query + ' WHERE'
        if (customerId) {
            query = query + ' "customerId"=$'+count
            count++
            params.push(customerId)
        }

        if (customerId && gameId) {
            query = query + ' AND'
        }

        if (gameId) {
            query = query + ' "gameId"=$' + count
            count++
            params.push(gameId)
        }
    }

    if (limit) {
        query = query + ' LIMIT $' + count
        count++
        params.push(limit)
    }

    if (offset) {
        query = query + ' OFFSET $' + count
        count++
        params.push(offset)
    }


    const rentals = await connection.query(query,params)
    rentals.rows = rentals.rows.map(rental => {
        const obj = {
                id: rental.id,
                customerId: rental.customerId,
                gameId: rental.gameId,
                rentDate: new Date(rental.rentDate).toLocaleDateString('pt-Br'),
                daysRented: rental.daysRented,
                returnDate: rental.returnDate ? new Date(rental.returnDate).toLocaleDateString('pt-Br') : null, // troca pra uma data quando já devolvido
                originalPrice: rental.originalPrice,
                delayFee: rental.delayFee ? new Date(rental.delayFee).toLocaleDateString('pt-Br') : null,
                customer: {
                    id: rental.customerId,
                    name: rental.customerName
                },
                game: {
                    id: rental.gameId,
                    name: rental.gameName,
                    categoryId: rental.categoryId,
                    categoryName: rental.categoryName
                }
            }

            return obj
        })

    res.send(rentals.rows);
})

app.post('/rentals', async (req,res) => {
    const {customerId,gameId,daysRented} = req.body

    const { error } = postRentalSchema.validate(req.body)
    if (error) {
        res.status(400).send(error.details[0].message)
        return
    }

    try {
        const game = await connection.query('SELECT * FROM games WHERE id=$1',[gameId])
        if (!game.rowCount) {
            res.status(400).send('game not found')
            return
        }
        const customer = await connection.query('SELECT * FROM customers WHERE id=$1',[customerId])
        if (!customer.rowCount) {
            res.status(400).send('customer not found')
            return
        }

        const rentals = await connection.query('SELECT * FROM rentals WHERE "gameId"=$1;',[gameId])
        if (rentals.rowCount >= game.rows[0].stockTotal) {
            res.status(400).send('max rentals reached for this game')
            return
        }
        
        const postObj = {
            customerId,
            gameId,
            rentDate: new Date().toLocaleDateString('pt-Br'),    
            daysRented,             
            returnDate: null,          
            originalPrice: game.rows[0].pricePerDay * daysRented,       
            delayFee: null             
        }

        await connection.query(`
            INSERT INTO 
                rentals 
                ("customerId","gameId","rentDate","daysRented","returnDate","originalPrice","delayFee")
            VALUES
                ($1,$2,$3,$4,$5,$6,$7)
            `,[postObj.customerId,postObj.gameId,postObj.rentDate,postObj.daysRented,postObj.returnDate,postObj.originalPrice,postObj.delayFee])
        
        res.sendStatus(201)
    }
    catch (error) {
        console.log(error)
        res.sendStatus(500)
    }
})

app.post('/rentals/:id/return', async (req,res) => {
    const { id } = req.params

    const { error } = joi.object({ id: joi.number().min(1).required() }).validate({ id })
    if (error) {
        res.status(400).send(error.details[0].message)
        return
    }

    try {
    
        const rental = await connection.query('SELECT * FROM rentals WHERE id=$1',[id])
        if (!rental.rowCount) {
            res.sendStatus(404)
            return
        }

        if (rental.rows[0].returnDate) {
            res.status(400).send('rental closed already')
            return
        }
        const game = await connection.query('SELECT * FROM games WHERE id=$1',[rental.rows[0].gameId])
        if (!game.rowCount) {
            res.sendStatus(404)
            return
        }

        let rentDateFormated = new Date(rental.rows[0].rentDate).toLocaleDateString('en-Us')      // DD/MM/YYYY
            rentDateFormated = dayjs(rentDateFormated).format('YYYY-MM-DD')
        const limitDateFormated = dayjs(rentDateFormated).add(rental.rows[0].daysRented,'day')

        const returnDate = new Date().toLocaleDateString('pt-Br')
        const returnDateUS = new Date().toLocaleDateString('en-Us')
        const returnDateFormated = dayjs(returnDateUS).format('YYYY-MM-DD')

        const daysDiff = Math.round(dayjs(returnDateFormated).diff(limitDateFormated) / 1000 / 60 / 60 / 24)
        const delayFee = daysDiff * game.rows[0].pricePerDay

        await connection.query(`
            UPDATE rentals 
            SET 
                "returnDate"=$1,
                "delayFee"=$2
            WHERE id=$3
        `,[returnDate,delayFee > 0 ? delayFee : 0,id])

        res.sendStatus(200)
    }
    catch (error) {
        console.log(error)
        res.sendStatus(500)
    }
})

app.delete('/rentals/:id', async (req,res) => {
    const { id } = req.params

    const { error } = joi.object({ id: joi.number().min(1).required() }).validate({ id })
    if (error) {
        res.status(400).send(error.details[0].message)
        return
    }

    try {
        const existingRental = await connection.query('SELECT * FROM rentals WHERE id=$1',[id])
        if (!existingRental.rowCount) {
            res.sendStatus(404)
            return
        }

        if (existingRental.rows[0].returnDate) {
            res.status(400).send('rental já finalizada. Não exclui por causa de historico? Pq poderia excluir uma nao finalizada entao?')
            return
        }

        await connection.query('DELETE FROM rentals WHERE id=$1',[id])
        res.sendStatus(200)
    } 
    catch (err) {
        console.log(err)
        res.sendStatus(500)
    }
})

app.listen(PORT, () => console.log(`Listening on port ${PORT}`))

