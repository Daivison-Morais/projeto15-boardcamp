import express from "express";
import cors from "cors";
import {
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
} from "./controllers.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/status", async (req, res) => {
  res.send("ok");
});

app.get("/categories", getCategories);
app.post("/categories", postCategories);

app.get("/games", getGames);
app.post("/games", postGames);

app.get("/customers", getCustomers);
app.post("/customers", postCustomers);
app.get("/customers/:id", getIdCustomers);
app.put("/customers/:id", putCustomers);

app.get("/rentals", getRentals);
app.post("/rentals", postRentals);
app.post("/rentals/:id/return", postRentalsReturn);
app.delete("/rentals/:id", deleteRentals);

app.listen(4000, () => {
  console.log("listen on 4000");
});
