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

function getBalance(statement){ //Função para verificar saldo, recebendo o statement

  //Operação reduce - Ela pega a informaçoes de determinado valores que passamos para ela é ela vai transforma todos os valores em um valor somente
  const balance = statement.reduce((acc, operation) => {
     // acc = Acumulador, vai acumular o valor que estamos recebendo. 
    //operation = "credit" ou "debit" ele vai mudar a função de acordo a operation
    if(operation.type === "credit"){//Caso seja credito
      return acc + operation.amount //vai somar o operation.amount mais acc
    }else{
      return acc - operation.amount //Caso seja debito (saque) ele vai subtrair
    }
  }, 0)//Este parâmetro é que vamos iniciar o reduce, que será 0 

  return balance //Vai retornar um valor de credito menos debito
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

app.post("/withdraw", verifyIfExistsAccountCPF, (request, response) =>{ // Realizar saque 

  const { amount } = request.body // Pegar o valor desejado do saque no JSON (insomnia)
  const {customer} = request //Recuperar o customer do nosso Middleware já verificado

  const balance = getBalance(customer.statement) // Enviado o customer.statement para nossa função verificar o valor que possui.

  if(balance < amount){ // Se caso o valor do balance seja menor que o valor que desejamos sacar, ele vai retornar um erro de valor insulficiente!
    return response.status(400).json({error: "Insufficient Funds!"}) 
  }

  const statementOperation = { //Criar novo array de dados com os dados do debit(saque) 
    amount, 
    created_at: new Date(),
    type: "debit"
  }

  customer.statement.push(statementOperation) //Vai enviar para nossa array os dados do saque

  return response.status(201).send() //Retornar status de 201. ok

})

app.get("/statement/data",verifyIfExistsAccountCPF, (request, response) => { 
  
  const {date} = request.query // Vai pegar a data dentro do query params(url)
  const {customer} = request // Chamada da const customer da função verifyIfExistsAccountCPF.

  const dateFormat = new Date(date + " 00:00") //Ele vai formatar a data, para obter qualquer hórario do dia.

  const statement = customer.statement.filter((statement) => statement.created_at.toDateString() === new Date(dateFormat).toDateString())
  //Ele vai percorrer nossa array customer.statement, adicionado um filter para pegar o created.at (data) e tranformar em Data String ** é fazer a comparação com a data formatada que pegamos do query params(URL)

  return response.json(statement) //Retornar o statement, caso possua.
})

app.put("/account", verifyIfExistsAccountCPF, (request, response) => {

  const {name} = request.body //Ele vai pegar o novo nome no JSON(insomnia)
  const {customer} = request

  customer.name = name

  return response.status(201).send()

})

app.get("/account", verifyIfExistsAccountCPF, (request, response) => {
  const {customer} = request
  return response.json(customer)
})

app.delete("/account", verifyIfExistsAccountCPF, (request, response) => {
  const {customer} = request
  customers.splice(customer, 1)

  return response.status(201).json(customers)

})

app.get("/balance", verifyIfExistsAccountCPF, (request, response) => {

  const { customer} = request

  const balance = getBalance(customer.statement)

  return response.json(balance)

})



app.listen(3333)
