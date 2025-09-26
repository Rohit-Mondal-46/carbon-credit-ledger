const express = require('express');
const router = express.Router();
const recordsController = require('../controllers/recordsController');

//create a new record
router.post('/', recordsController.createRecord);

//retire record
router.post('/:id/retire', recordsController.retireRecord);

//get record
router.get('/:id', recordsController.getRecord);

module.exports = router;