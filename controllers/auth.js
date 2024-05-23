const { response } = require("express");
const bcrypt = require("bcryptjs");
const jsonWebToken = require("jsonwebtoken");
const User = require("../models/User");
const { triggerJWT } = require("../helpers/jwt");
const {
  sendPasswordResetEmail,
} = require("../middlewares/validate-email-reset-password");

// register
const createUser = async (req, res = response) => {
  const { email, password, phone } = req.body;

  try {
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({
        ok: false,
        msg: "Un usuario ya existe con este correo",
      });
    }

    user = new User(req.body);

    //encrypt password with bcryptjs
    const salt = bcrypt.genSaltSync();
    user.password = bcrypt.hashSync(password, salt);
    user.image =
      "http://somebooks.es/wp-content/uploads/2018/12/Poner-una-imagen-a-la-cuenta-de-usuario-en-Windows-10-000.png";
    user.phone = phone || null;
    user.admin = false;
    await user.save();

    //* trigger jwt
    const token = await triggerJWT(
      user.id,
      user.name,
      user.lastname,
      user.country,
      user.city,
      user.phone,
      user.image,
      user.admin
    );

    return res.status(201).json({
      ok: true,
      uid: user.id,
      name: user.name,
      email: user.email,
      lastname: user.lastname,
      country: user.country,
      city: user.city,
      phone: user.phone,
      image: user.image,
      admin: user.admin,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: "Error en nuestro servidor, comunícate con el administrador del grupo para tu registro.",
    });
  }
};

// get information user
const userInformations = async (req, res = response) => {
  const { id } = req.body;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(400).json({
        ok: false,
        msg: "El usario no existe con ese ID",
      });
    }
    res.json({
      ok: true,
      uid: user.id,
      lastname: user.lastname,
      name: user.name,
      email: user.email,
      city: user.city,
      country: user.country,
      phone: user.phone,
      image: user.image,
      admin: user.admin,
      CourseProgress: user.CourseProgress,
      lastViewedVideos: user.lastViewedVideos,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: "Por favor comunícate con el administrador",
    });
  }
};
// Login

const loginUser = async (req, res = response) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        ok: false,
        msg: "Usuario o contraseña incorrecta",
      });
    }

    //* confirm the passwords
    const validPassword = bcrypt.compareSync(password, user.password);

    if (!validPassword) {
      return res.status(400).json({
        ok: false,
        msg: "Usuario o contraseña incorrecta",
      });
    }

    //*Generate our Jwt

    const token = await triggerJWT(
      user.id,
      user.name,
      user.email,
      user.ciy,
      user.country,
      user.lastname,
      user.phone,
      user.image,
      user.admin
    );

    res.json({
      ok: true,
      uid: user.id,
      lastname: user.lastname,
      name: user.name,
      email: user.email,
      city: user.city,
      country: user.country,
      phone: user.phone,
      image: user.image,
      admin: user.admin,
      CourseProgress: user.CourseProgress,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: "Comunícate con el administrador del grupo.",
    });
  }
};

// renew token

const revalidateToken = async (req, res = response) => {
  const { name, email, uid, city, lastname, phone, country, admin } = req;

  //* generate a new JWT and return it in this request
  const token = await triggerJWT(
    name,
    email,
    uid,
    city,
    country,
    phone,
    lastname,
    admin
  );

  res.json({
    ok: true,
    uid,
    name,
    email,
    city,
    lastname,
    country,
    phone,
    token,
    admin,
  });
};
const editInformationUser = async (req, res = response) => {
  const { id } = req.params;
  const { _id, ...resto } = req.body;

  const user = await User.findByIdAndUpdate(id, resto);

  res.json({
    msg: "put API - UsuarioPut",
    id,
    user,
  });
};

const changePassword = async (req, res = response) => {
  const { id } = req.params;
  const { password } = req.body;

  try {
    // Validate if the user exists (you can add more validations here
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Generate the hash of the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    //Here you can perform other actions like sending an email or generating a JWT token if needed

    res.json({
      msg: "Contraseña actualizada exitosamente",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar la contraseña" });
  }
};

const validatePassword = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        ok: false,
        msg: "Usuario no encontrado",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        ok: false,
        msg: "Contraseña incorrecta",
      });
    }

    res.status(200).json({
      ok: true,
      msg: "Contraseña válida",
    });
  } catch (error) {
    console.error("Error al validar la contraseña:", error);
    res.status(500).json({
      ok: false,
      msg: "Por favor comunícate con el administrador",
    });
  }
};

const emailUserPasswordForget = async (req, res = response) => {
  const { id } = req.params;

  const { email } = req.body;

  try {
    let user = await User.findOne({ email });
    const token = await triggerJWT(
      user.id,
      user.name,
      user.email,
      user.ciy,
      user.country,
      user.lastname,
      user.phone,
      user.image
    );
    if (!user) {
      return res.status(400).json({
        ok: false,
        msg: "El usario no existe con ese email",
      });
    }
    const resetToken = jsonWebToken.sign({ userId: id }, "secret_key", {
      expiresIn: "1h",
    });
    await sendPasswordResetEmail(user.email, resetToken);
    //*Generar nuestro Jwt
    res.json({
      ok: true,
      uid: user.id,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: "Por favor comunícate con el administrador",
    });
  }
};

const allStudents = async (req, res = response) => {
  const { id } = req.params;

  try {
    const adminUser = await User.findById(id);

    if (!adminUser || !adminUser.admin) {
      return res.status(403).json({
        ok: false,
        msg: "Acceso denegado",
      });
    }

    const studentCount = await User.countDocuments({ admin: false });

    res.status(200).json({
      ok: true,
      studentCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: "Error",
    });
  }
};

const allAdmins = async (req, res = response) => {
  const { id } = req.params;

  try {
    const adminUser = await User.findById(id);

    if (!adminUser || !adminUser.admin) {
      return res.status(403).json({
        ok: false,
        msg: "Acceso denegado",
      });
    }

    const admins = await User.find(
      { admin: true },
      {
        _id: 1,
        name: 1,
        lastname: 1,
        image: 1,
      }
    );

    if (!admins) {
      return res.status(404).json({ message: "Admins no es" });
    }

    res.json({ admins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
module.exports = {
  createUser,
  loginUser,
  revalidateToken,
  editInformationUser,
  emailUserPasswordForget,
  changePassword,
  validatePassword,
  userInformations,
  allStudents,
  allAdmins,
};
