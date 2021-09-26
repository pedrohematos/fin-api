const express = require("express");
const { v4: uuidv4 } = require("uuid");

const app = express();
const port = process.env.PORT || 3000; // Port where the application will run.

app.use(express.json());

/**
 * cpf - string
 * name - string
 * id - uuid
 * statement - []
 */
const customers = [];

//Middleware
function verifyIfExistsAccountCpf(req, res, next) {
  const { cpf } = req.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);

  if (!customer) {
    return res.status(400).json({ error: "Customer not found" });
  }

  req.customer = customer;

  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === "credit") {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);

  return balance;
}

app.post("/account", (req, res) => {
  const { cpf, name } = req.body;

  if (!cpf || !name) {
    return res.status(400).json({ error: "Missing cpf or name parameter" });
  }

  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlreadyExists) {
    return res.status(400).json({ error: "Customer already exists" });
  }

  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: [],
  });

  return res.status(201).json({ message: "Customer successfully created" });
});

app.get("/statement", verifyIfExistsAccountCpf, (req, res) => {
  const { customer } = req;

  return res.json(customer.statement);
});

app.post("/deposit", verifyIfExistsAccountCpf, (req, res) => {
  const { description, amount } = req.body;
  const { customer } = req;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  };

  customer.statement.push(statementOperation);

  return res.status(201).json({ message: "Deposit successfully created" });
});

app.post("/withdraw", verifyIfExistsAccountCpf, (req, res) => {
  const { amount } = req.body;
  const { customer } = req;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return res.status(400).json({ error: "Insufficient funds" });
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit",
  };

  customer.statement.push(statementOperation);

  return res.status(201).json({ message: "Withdraw successfully created" });
});

app.get("/statement/date", verifyIfExistsAccountCpf, (req, res) => {
  const { customer } = req;
  const { date } = req.query;

  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter(
    (statement) =>
      statement.created_at.toDateString() ===
      new Date(dateFormat).toDateString()
  );

  return res.json(statement);
});

app.put("/account", verifyIfExistsAccountCpf, (req, res) => {
  const { customer } = req;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Missing name parameter" });
  }

  customer.name = name;

  return res.status(201).json({ message: "Customer successfully updated" });
});

app.get("/account", verifyIfExistsAccountCpf, (req, res) => {
  const { customer } = req;

  return res.status(201).json(customer);
});

app.delete("/account", verifyIfExistsAccountCpf, (req, res) => {
  const { customer } = req;

  customers.splice(customer, 1);

  return res.status(201).json({ message: "Customer successfully deleted" });
});

app.get("/balance", verifyIfExistsAccountCpf, (req, res) => {
  const { customer } = req;

  const balance = getBalance(customer.statement);

  return res.json({ balance: balance });
});

app.listen(port, () => {
  console.log(`Server succesfully running at http://localhost:${port}`);
});
