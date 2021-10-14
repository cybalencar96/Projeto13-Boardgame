import express from 'express'

const app = express()
const PORT = process.env.PORT || 4000

app.use(express.json())

app.get('/alive', (req,res) => {
    res.send("I'm alive!!!")
})

app.listen(PORT, () => console.log(`Listening on port ${PORT}`))