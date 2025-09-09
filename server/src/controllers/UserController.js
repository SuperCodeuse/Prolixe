const bcrypt = require('bcrypt');

exports.register = async (req, res) => {
    const { email, password, firstname, name, role } = req.body;
    const pool = req.pool;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const connection = await pool.getConnection();

        const [result] = await connection.execute(
            'INSERT INTO USER (email, password, firstname, name, role) VALUES (?, ?, ?, ?, ?)',
            [email, hashedPassword, firstname, name, role || 'USER']
        );

        connection.release();

        res.status(201).json({ message: 'User created successfully', userId: result.insertId });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Email already exists' });
        }
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};