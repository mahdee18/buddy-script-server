const jwt = inport('jsonwebtoken');

/** Generates a JSON Web Token for a given user ID. */
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    });
};

module.exports = generateToken;