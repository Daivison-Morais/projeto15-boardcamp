import pkg from "pg";
import joi from "joi";
import dayjs from "dayjs";
import convertMilisInDate from "./convertMillSegDate.js";

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

async function postCategories(req, res) {
  const { name } = req.body;
  if (name === "") {
    return res.sendStatus(400);
  }
  const nameExist = await connection.query(
    `SELECT * FROM categories WHERE name = '${name}';`
  );
  console.log("aqui:", nameExist);
  if (nameExist.rows.length > 0) {
    return res.sendStatus(409);
  }

  await connection.query("INSERT INTO categories (name) VALUES ($1);", [name]);

  try {
    res.sendStatus(201);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
}

async function getGames(req, res) {
  const { name } = req.query;

  if (name) {
    const categories = await connection.query(
      `SELECT games.*, categories.name AS "categorieName" FROM games JOIN categories ON games."categoryId" = categories.id WHERE games.name LIKE $1;`,
      [`${name}%`]
    );
    return res.send(categories);
  }

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
    const nameExist = await connection.query(
      `SELECT * FROM games WHERE name = '${name}';`
    );
    console.log("aqui", nameExist.rows);
    if (nameExist.rows.length === 0) {
      return res.sendStatus(409);
    }

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
  birthday: joi.string().required(),
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

async function putCustomers(req, res) {
  const { id } = req.params;
  const { name, phone, cpf, birthday } = req.body;

  const validation = postCustomersSchema.validate(req.body, {
    abortEarly: false,
  });
  if (validation.error) {
    const error = validation.error.details.map((value) => value.message);
    return res.status(400).send(error);
  }

  await connection.query(
    `
    UPDATE customers SET name = $1, phone = $2, cpf = $3, birthday = $4 WHERE Id = $5;`,
    [name, phone, cpf, birthday, id]
  );

  try {
    res.sendStatus(201);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
}

async function getRentals(req, res) {
  const { customerId, gamerId } = req.query;
  console.log(customerId);

  if (customerId) {
    const clientes = (
      await connection.query(
        `SELECT rentals.*, json_build_object('id', customers.id, 'name', customers.name) AS customer, 
        json_build_object('id', games.id, 'name', games.name, 'categoryId', "categoryId", 'categoryName', categories.name) AS game 
        FROM rentals 
        JOIN customers ON rentals."customerId" = customers.id  
        JOIN games ON  rentals."gameId" = games.id JOIN categories ON games."categoryId" = categories.id 
        WHERE rentals."customerId" = ${customerId};`
      )
    ).rows[0];

    const cliente = { ...clientes, rentDate: dayjs().format("YYYY-MM-DD") };
    return res.send(cliente);
  }

  if (gamerId) {
    const clientes = (
      await connection.query(
        `SELECT rentals.*, json_build_object('id', customers.id, 'name', customers.name) AS customer, 
        json_build_object('id', games.id, 'name', games.name, 'categoryId', "categoryId", 'categoryName', categories.name) AS game 
        FROM rentals 
        JOIN customers ON rentals."customerId" = customers.id  
        JOIN games ON  rentals."gameId" = games.id 
        JOIN categories ON games."categoryId" = categories.id 
        WHERE rentals."gameId" = ${gamerId};`
      )
    ).rows[0];

    const cliente = { ...clientes, rentDate: dayjs().format("YYYY-MM-DD") };

    return res.send(cliente);
  }

  const clientes = await connection.query(
    `SELECT rentals.*, json_build_object('id', customers.id, 'name', customers.name) AS customer, json_build_object('id', games.id, 'name', games.name, 'categoryId', "categoryId", 'categoryName', categories.name) AS game FROM rentals JOIN customers ON rentals."customerId" = customers.id  JOIN games ON  rentals."gameId" = games.id JOIN categories ON games."categoryId" = categories.id;`
  );

  try {
    res.send(clientes.rows);
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

async function postRentalsReturn(req, res) {
  const { id } = req.params;

  try {
    const rentalExist = await connection.query(
      `SELECT * FROM rentals WHERE rentals.id = $1;`,
      [id]
    );

    if (rentalExist.rows.length === 0) {
      return res.status(404).send({ erro: "Aluguél não encontrado" });
    }

    const rental = (
      await connection.query(
        `SELECT rentals.*, games."pricePerDay" FROM rentals JOIN games ON rentals."gameId" = games.id WHERE rentals.id = $1;`,
        [id]
      )
    ).rows[0];

    rental.returnDate = dayjs().format("YYYY-MM-DD");

    /*  const delayfee =
    Date.now() -[dayjs(rental.rentDate).valueOf() + rental.daysRented * 86400 * 1000];
    console.log(rental.rentDate);
    console.log(dayjs(rental.rentDate).valueOf());
    console.log(rental.daysRented);
    console.log(Date.now());

    console.log(convertMilisInDate(delayfee)); */

    //console.log(rental);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
}

async function deleteRentals(req, res) {
  const { id } = req.params;

  const rentalExist = await connection.query(
    `SELECT * FROM rentals WHERE rentals.id = $1;`,
    [id]
  );

  if (rentalExist.rows.length === 0) {
    return res.status(404).send({ erro: "Aluguél não encontrado" });
  }

  const rentalFinalizado = (
    await connection.query(
      `SELECT rentals."returnDate" FROM rentals WHERE rentals.id = $1;`,
      [id]
    )
  ).rows[0];
  console.log(rentalFinalizado);

  if (rentalFinalizado.returnDate === null) {
    return res.status(400).send({ erro: "aluguél não finalizado" });
  }

  const deleteRental = await connection.query(
    `DELETE FROM rentals WHERE rentals.id = $1;`,
    [id]
  );

  console.log(rentalExist.rows[0]);
  try {
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
}

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
  deleteRentals,
};
