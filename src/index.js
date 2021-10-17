import express from 'express'
import pg from 'pg'
import { 
    postCustomerSchema,
    postGameSchema,
    categSchema
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
    const { cpf } = req.query
    
    try {
        let result;
        if (cpf) {
            result = await connection.query(`SELECT * FROM customers WHERE cpf LIKE $1`,[cpf + '%'])
        } else {
            result = await connection.query(`SELECT * FROM customers`)
        }
        
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
    const { customerId, gameId } = req.query

    const sqlQuery = `
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
    JOIN categories ON games."categoryId" = categories.id
    ${ gameId || customerId ? "WHERE" : ""} 
        ${customerId ? `"customerId"=`+customerId : ""} 
    ${ gameId && customerId ? "AND" : ""}
        ${ gameId ? '"gameId"='+gameId : ""};
    `

    const rentals = await connection.query(sqlQuery)
    rentals.rows = rentals.rows.map(rental => {
        const obj = {
                id: rental.id,
                customerId: rental.customerId,
                gameId: rental.gameId,
                rentDate: new Date(rental.rentDate).toLocaleDateString('pt-Br'),
                daysRented: rental.daysRented,
                returnDate: rental.returnDate ? new Date(rental.returnDate).toLocaleDateString('pt-Br') : null, // troca pra uma data quando já devolvido
                originalPrice: rental.originalPrice,
                delayFee: new Date(rental.delayFee).toLocaleDateString('pt-Br'),
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

app.listen(PORT, () => console.log(`Listening on port ${PORT}`))