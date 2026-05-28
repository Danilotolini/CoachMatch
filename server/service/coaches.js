import testeDbConnection from "../repository/coaches.js"

const registerCoach = (req,res) => {
    const coach = req.body
    const response = testeDbConnection(coach)
    res.send(response)
}

export default registerCoach