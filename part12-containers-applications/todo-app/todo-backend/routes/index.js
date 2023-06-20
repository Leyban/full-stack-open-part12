const express = require('express');
const router = express.Router();
const redis = require('../redis')

const configs = require('../util/config')

let visits = 0

/* GET index data. */
router.get('/', async (req, res) => {
  visits++

  res.send({
    ...configs,
    visits
  });
});

// GET Statistics
router.get('/statistics', async (req, res) => {
  const addedTodos = await redis.getAsync("added_todos")

  console.log(addedTodos)

  res.send({
    "added_todos": addedTodos
  });
});
module.exports = router;
