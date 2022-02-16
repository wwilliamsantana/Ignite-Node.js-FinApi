const { response, request } = require('express')
const express = require('express')
const { v4: uuidv4 } = require('uuid')
const app = express()

const customers = []

app.use(express.json())

function verifyIfExistsAccountCPF(request, response, next){
  //Middleware, toda vez que for chamado ele fará a verificação do cpf, caso EXISTA ele dar continuidade.
  //Buscando o statement por cpf, caso exista ele dar continuidade, se não existir (for vazio) ele entra no if acusando erro.

  const {cpf} = request.headers // Pega o CPF que foi adicionado no Header(insomnia)
  const customer = customers.find((customer) => customer.cpf === cpf) //faz a busca dentro da array customers, verificando se existe algum eleemnto dentro de customer.cpf igual ao cpf passado pelo header

  if(!customer){  //Retorna o erro caso o customer seja vazio
    return response.status(400).json({error: "Customer not found"}) 
  }
  request.customer = customer  //Dessa forma ele passará o customer pelo request, quando for chamado (para ser chamado dentro de outro método, usaremos {customer} = request;). 

  return next() // caso a const customer tenha um elemento é não entre no if, ele dará continuidade.
}



app.post('/account', (request, response) => {  //Cadastro de conta
  const { cpf, name } = request.body

  const customersAlreadyExists = customers.some((customer) => customer.cpf === cpf)  //Comparação de cpf, para verificar se existe iguais - retornar boolean
    
  if(customersAlreadyExists){
    return response.status(400).json({error: "Customer Already Exists!"})
  }

  customers.push({  //Está fazendo push para a array "customers"
    name, 
    cpf, 
    id : uuidv4(), 
    statement: [] })

  
  return response.status(201).send()
})

app.get("/statement",verifyIfExistsAccountCPF, (request, response) => { 
  
  const {customer} = request // Chamada da const customer da função verifyIfExistsAccountCPF.

  //Caso tudo ocorra sem erro, ele dará continuidade de acordo ao retorno da função(next) 
  return response.json(customer.statement)

})

app.post("/deposit", verifyIfExistsAccountCPF, (request, response) => { //Realizar depósitos.

  const {description, amount} = request.body //Vai pegar do JSON(Insomnia) os dados 
  const {customer} = request //Recupera o customer do nosso Middleware, já verificado.

  const statementOperation = {//Cria a array de dados que será colocado dentro do nosso customer.statement.
      description,
      amount,
      created_at: new Date(), 
      type: "credit"
  }

  customer.statement.push(statementOperation) //Está fazendo o push para dentro do customer.
  
  return response.status(201).send() //Retornar status 201, caso finalize.

})



app.listen(3333)
