import '../src/setup.js'
import supertest from 'supertest'
import {connection} from '../src/index.js'
import app from '../src/index.js'


afterAll(async () => {
    await connection.end();
})

describe('rota GET /categories', () => {

    beforeAll(async () => {
        await connection.query(`INSERT INTO categories (name) VALUES ('terror'), ('acao')`)
    })

    afterAll(async () => {
        await connection.query('DELETE FROM categories')
    })

    test('should return 200 and categories',async () => {
        const result = await supertest(app).get('/categories')
        expect(result.status).toEqual(200)
        expect(result.body.length).toEqual(2)
        expect(result.body[0].name).toEqual('terror')

    })
    
    test('should return 200 and categories with limit',async () => {
        const result = await supertest(app).get('/categories?limit=1')
        expect(result.status).toEqual(200)
        expect(result.body.length).toEqual(1)
    })

    test('should return 200 and categories with order',async () => {
        const result = await supertest(app).get('/categories?order=name')
        expect(result.status).toEqual(200)
        expect(result.body.length).toEqual(2)
        expect(result.body[0].name).toEqual('acao')
    })

    test('should return 200 and categories with offset',async () => {
        const result = await supertest(app).get('/categories?offset=1')
        expect(result.status).toEqual(200)
        expect(result.body.length).toEqual(1)
        expect(result.body[0].name).toEqual('acao')
    })

    test('should return 200 and categories with desc',async () => {
        const result = await supertest(app).get('/categories?order=name&desc=true')
        expect(result.status).toEqual(200)
        expect(result.body.length).toEqual(2)
        expect(result.body[0].name).toEqual('terror')
    })
})