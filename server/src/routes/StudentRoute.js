const express = require('express');
const router = express.Router();
const StudentController = require('../controllers/StudentController');

router.get('/class/:classId', StudentController.getStudentsByClass);
router.post('/', StudentController.createStudent);
router.put('/:id', StudentController.updateStudent);
router.delete('/:id', StudentController.deleteStudent);

module.exports = router;