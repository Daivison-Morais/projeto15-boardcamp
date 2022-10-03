import pkg from "pg";
import joi from "joi";
import dayjs from "dayjs";

const { Pool } = pkg;
const connection = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "1441",
  database: "boardcamp",
});

async function getCategories(req, res) {
  const categories = await connection.query("SELECT * FROM categories;");

  try {
    res.send(categories.rows);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
}
////////////EXISTENCIA - REGRAS DE NEGÓCIO
async function postCategories(req, res) {
  const { name } = req.body;
  if (name === "") {
    return res.sendStatus(400);
  }
  /* const nameExist = await connection.query(
    `SELECT * FROM categories WHERE name = ${name};`
  );
  console.log("aqui:", nameExist);
  if (nameExist) {
    return req.sendStatus(409); 
  }*/
  await connection.query("INSERT INTO categories (name) VALUES ($1);", [name]);

  try {
    res.sendStatus(201);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
}

///////////////REGRAS DE NEGÓCIO - QUERY STRINGS
async function getGames(req, res) {
  const categories = await connection.query(
    `SELECT games.*, categories.name AS "categorieName" FROM games JOIN categories ON games."categoryId" = categories.id
  `
  );

  try {
    res.send(categories.rows);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
}

const postGamesSchema = joi.object({
  name: joi.string().required(),
  image: joi.string().required(),
  stockTotal: joi.number().min(1).required(),
  categoryId: joi.required(),
  pricePerDay: joi.number().min(1).required(),
});

//// ID DE CATEGORIA EXISTENTE, NÃO PODE TER NOME REPETIDO
async function postGames(req, res) {
  const { name, image, stockTotal, categoryId, pricePerDay } = req.body;

  const validation = postGamesSchema.validate(req.body, { abortEarly: false });
  if (validation.error) {
    const error = validation.error.details.map((value) => value.message);
    return res.status(400).send(error);
  }

  try {
    /* const nameExist = await connection.query(
      `SELECT * FROM games WHERE name = '${name}';`
    );
    console.log("aqui", nameExist);
    if (nameExist.rows == 0) {
      return res.sendStatus(409);
    } */

    await connection.query(
      `INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5);`,
      [name, image, stockTotal, categoryId, pricePerDay]
    );

    res.sendStatus(201);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
}
////////////////////
///////// FILTRAR VIA QUERY STRING, POR UMA PARTE DO CPF
async function getCustomers(req, res) {
  const clientes = await connection.query("SELECT * FROM customers;");

  clientes.rows.forEach(
    (value) => (value.birthday = dayjs(value.birthday).format("YYYY-MM-DD"))
  );

  try {
    res.send(clientes.rows);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
}

/////////////PRONTO
async function getIdCustomers(req, res) {
  const { id } = req.params;

  try {
    const cliente = await connection.query(
      `SELECT * FROM customers WHERE id = $1;`,
      [id]
    );
    const clienteOne = cliente.rows[0];

    if (cliente.rows.length === 0) {
      return res.sendStatus(400);
    }

    const birthdayAdjusted = dayjs(clienteOne.birthday).format("YYYY-MM-DD");

    res.send({ ...clienteOne, birthday: birthdayAdjusted });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
}

const postCustomersSchema = joi.object({
  name: joi.string().required(),
  phone: joi.string().min(10).max(11).required(),
  cpf: joi.string().min(11).max(11).required(),
  birthday: joi.required(),
});

/////////////CPF NÃO PODE SER DE UM CLIENTE EXISTENTE

async function postCustomers(req, res) {
  const { name, phone, cpf, birthday } = req.body;

  const validation = postCustomersSchema.validate(req.body, {
    abortEarly: false,
  });
  if (validation.error) {
    const error = validation.error.details.map((value) => value.message);
    return res.status(400).send(error);
  }

  await connection.query(
    "INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1, $2, $3, $4);",
    [name, phone, cpf, birthday]
  );

  try {
    res.sendStatus(201);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
}

//// UPDATE COM VARIOS?
async function putCustomers(req, res) {
  const { name, phone, cpf, birthday } = req.body;
  await connection.query(
    "UPDATE customers SET (name, phone, cpf, birthday) VALUES ($1, $2, $3, $4);",
    [name, phone, cpf, birthday]
  );

  try {
    res.sendStatus(201);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
}

//MESCLAR COM OUTRA TABELAS
async function getRentals(req, res) {
  const rentals = await connection.query("SELECT * FROM rentals;");

  try {
    res.send(rentals.rows);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
}
//// ///////post pronto
async function postRentals(req, res) {
  const { customerId, gameId, daysRented } = req.body;

  if (Number(daysRented) <= 0) {
    return res
      .status(400)
      .send({ erro: "dias alugados deve ser maior que zero" });
  }

  const rentDate = dayjs().format("YYYY-MM-DD");

  try {
    const customerIdExist = await connection.query(
      `SELECT * FROM customers WHERE id = '${customerId}';`
    );
    if (customerIdExist.rows.length === 0) {
      return res.status(400).send({ erro: "cliente não econtrado" });
    }

    const gameIdExist = await connection.query(
      `SELECT * FROM games WHERE id = '${gameId}';`
    );
    if (gameIdExist.rows.length === 0) {
      return res.status(400).send({ erro: "Jogo não encontrado" });
    }

    const pricePerDayArray = (
      await connection.query(
        `SELECT games."pricePerDay" FROM games WHERE id = '${gameId}';`
      )
    ).rows[0];

    const pricePerDay = pricePerDayArray.pricePerDay;
    const originalPrice = daysRented * pricePerDay;
    const returnDate = null;
    const delayFee = null;

    const stockTotal = (
      await connection.query(
        `SELECT games."stockTotal" FROM games WHERE id = '${gameId}';`
      )
    ).rows[0];
    if (stockTotal.stockTotal <= 0) {
      return res.status(400).send({ erro: "estoque vazio" });
    }

    const rental = await connection.query(
      `INSERT INTO rentals ("customerId", "gameId", "daysRented", "rentDate", "originalPrice", "returnDate", "delayFee") VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [
        customerId,
        gameId,
        daysRented,
        rentDate,
        originalPrice,
        returnDate,
        delayFee,
      ]
    );

    const updateStockTotal = stockTotal.stockTotal - 1;
    console.log(updateStockTotal);

    const UpdateRentalsAvailable = connection.query(
      `UPDATE games SET "stockTotal" = ${updateStockTotal} WHERE id = '${gameId}';`
    );

    res.sendStatus(201);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
}

async function postRentalsReturn(req, res) {}

export {
  getCategories,
  postCategories,
  getGames,
  postGames,
  getCustomers,
  postCustomers,
  putCustomers,
  getRentals,
  postRentals,
  getIdCustomers,
  postRentalsReturn,
};
