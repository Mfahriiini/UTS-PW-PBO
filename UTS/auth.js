const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('./db');

// Route: Register - Get form
router.get('/register', (req, res) => res.render('register'));

// Route: Register - Post form
router.post('/register', async (req, res) => {
    const { name, nim, major, birth_place_date, address, email, password, instrument } = req.body;

    // Validate required fields
    if (!name || !nim || !major || !birth_place_date || !address || !email || !password) {
        return res.send('Please fill all required fields.');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user into the database
        db.query(
            'INSERT INTO users (name, nim, major, birth_place_date, address, email, password, instrument) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, nim, major, birth_place_date, address, email, hashedPassword, instrument || null],
            (err) => {
                if (err) {
                    console.error("Error inserting user:", err);
                    return res.status(500).send('An error occurred while registering your account.');
                }
                res.redirect('/login');
            }
        );
    } catch (err) {
        console.error("Error hashing password:", err);
        res.status(500).send('Server error');
    }
});

// Route: Login - Get form
router.get('/login', (req, res) => res.render('login'));

// Route: Login - Post form
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).send('Server error');
        
        if (results.length === 0 || !(await bcrypt.compare(password, results[0].password))) {
            return res.send('Invalid email or password');
        }

        req.session.user = results[0];
        res.redirect('/profile');
    });
});

// Route: Profile - Show profile and swims
router.get('/profile', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const userId = req.session.user.id;

    db.query('SELECT * FROM swims WHERE user_id = ?', [userId], (err, swims) => {
        if (err) {
            console.error("Error fetching swims:", err);
            return res.status(500).send('An error occurred while fetching swim data.');
        }
        res.render('profile', { user: req.session.user, swims });
    });
});

// Route: Update Profile - Get form
router.get('/profile/edit', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const userId = req.session.user.id;

    db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            console.error("Error fetching user profile:", err);
            return res.status(500).send('An error occurred while fetching your profile.');
        }
        res.render('editProfile', { user: results[0] });
    });
});

// Route: Update Profile - Post form
router.post('/profile/update', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const { name, nim, major, birth_place_date, address, email, instrument } = req.body;
    const userId = req.session.user.id;

    db.query(
        'UPDATE users SET name = ?, nim = ?, major = ?, birth_place_date = ?, address = ?, email = ?, instrument = ? WHERE id = ?',
        [name, nim, major, birth_place_date, address, email, instrument || null, userId],
        (err) => {
            if (err) {
                console.error("Error updating profile:", err);
                return res.status(500).send('An error occurred while updating your profile.');
            }

            req.session.user = { ...req.session.user, name, nim, major, birth_place_date, address, email, instrument };
            res.redirect('/profile');
        }
    );
});

// Route: Delete Profile
router.post('/profile/delete', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const userId = req.session.user.id;

    db.query('DELETE FROM users WHERE id = ?', [userId], (err) => {
        if (err) {
            console.error("Error deleting profile:", err);
            return res.status(500).send('An error occurred while deleting your profile.');
        }
        req.session.destroy((err) => {
            if (err) return res.status(500).send('Error logging out');
            res.redirect('/');
        });
    });
});

// Route: Add a new swim
router.post('/swims/add', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const { name, tools, technic, type, difficulty, diagram, progress } = req.body;
    const userId = req.session.user.id;

    db.query(
        'INSERT INTO swims (user_id, name, tools, technic, type, difficulty, diagram, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, name, tools, technic, type, difficulty, diagram, progress],
        (err) => {
            if (err) {
                console.error("Error adding swim:", err);
                return res.status(500).send('An error occurred while adding the swim.');
            }
            res.redirect('/profile');
        }
    );
});

// Route: Update an existing swim
router.post('/swims/update/:id', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const { name, tools, technic, type, difficulty, diagram, progress } = req.body;
    const swimId = req.params.id;

    db.query(
        'UPDATE swims SET name = ?, tools = ?, technic = ?, type = ?, difficulty = ?, diagram = ?, progress = ? WHERE id = ?',
        [name, tools, technic, type, difficulty, diagram, progress, swimId],
        (err) => {
            if (err) {
                console.error("Error updating swim:", err);
                return res.status(500).send('An error occurred while updating the swim.');
            }
            res.redirect('/profile');
        }
    );
});

// Route: Delete a swim
router.post('/swims/delete/:id', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const swimId = req.params.id;

    db.query('DELETE FROM swims WHERE id = ?', [swimId], (err) => {
        if (err) {
            console.error("Error deleting swim:", err);
            return res.status(500).send('An error occurred while deleting the swim.');
        }
        res.redirect('/profile');
    });
});

// Route: Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error logging out:", err);
            return res.status(500).send('Error logging out');
        }
        res.redirect('/login');
    });
});

module.exports = router;
