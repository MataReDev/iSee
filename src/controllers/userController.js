const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/userModel");

const {
  validateLogin,
  validateRegister,
  validateUpdate,
} = require("../middleware/validator");

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).send(users);
  } catch (error) {
    res.status(500).send({ error: "Error fetching all users" });
  }
};

exports.profileUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-_id -isValidated -createdAt -updatedAt -__v"
    );
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send({ error: "Error fetching user profile" });
  }
};

exports.loginUsers = async (req, res) => {
  // Joi Validation
  const { error } = validateLogin(req.body);

  if (error) {
    console.log(error);
    return res.send(error.details);
  }

  // Recherchez l'utilisateur dans la base de données en utilisant l'e-mail envoyé dans la requête
  User.findOne({ email: req.body.email }, (err, user) => {
    if (err) {
      res.status(500).send(err);
    } else if (!user) {
      res.status(401).send({ message: "Incorrect email or password" });
    } else {
      // Vérifiez si le mot de passe envoyé dans la requête correspond au mot de passe hashé de l'utilisateur
      bcrypt.compare(req.body.password, user.password, (err, result) => {
        if (err) {
          res.status(500).send(err);
        } else if (!result) {
          res.status(401).send({ message: "Incorrect email or password" });
        } else {
          // Générez un jeton JWT pour l'utilisateur
          const token = jwt.sign(
            {
              id: user._id,
              username: user.username,
              email: user.email,
              isAdmin: user.isAdmin,
            },
            process.env.JWT_SECRET,
            { expiresIn: "5h" }
          );
          res.send({ token });
        }
      });
    }
  });
};

exports.registerUsers = async (req, res) => {
  const { error } = validateRegister(req.body);

  if (error) {
    console.log(error);
    return res.send(error.details);
  }

  // Vérifiez si l'adresse e-mail est déjà utilisée
  User.findOne({ email: req.body.email }, (err, user) => {
    if (err) {
      res.status(500).send(err);
    } else if (user) {
      res.status(400).send({ message: "This email address is already in use" });
    } else {
      // Hash le mot de passe de l'utilisateur
      bcrypt.hash(req.body.password, 10, (err, hash) => {
        if (err) {
          res.status(500).send(err);
        } else {
          // Créez un nouvel utilisateur avec les données envoyées dans la requête et le mot de passe hashé
          const newUser = new User({
            id: req.body.id,
            username: req.body.username,
            email: req.body.email,
            password: hash,
            isAdmin: req.body.isAdmin,
          });
          // Enregistrez l'utilisateur dans la base de données
          newUser.save((err, user) => {
            if (err) {
              console.error(err);
              res.status(500).send(err);
            } else {
              // Générez un jeton JWT pour l'utilisateur
              const token = jwt.sign(
                {
                  id: user._id,
                  username: user.username,
                  email: user.email,
                  isAdmin: user.isAdmin,
                },
                process.env.JWT_SECRET,
                { expiresIn: "5h" }
              );
              res.send({ token });
            }
          });
        }
      });
    }
  });
};

exports.updateUsers = async (req, res) => {
  const { error } = validateUpdate(req.body);

  if (error) {
    console.log(error);
    return res.send(error.details);
  }

  try {
    const { username, email } = req.body;

    // Vérifier si le nouveau nom d'utilisateur existe déjà
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "This username is already taken." });
    }

    // Vérifier si le nouvel e-mail existe déjà
    const existingEmail = await User.findOne({ email });

    if (existingEmail) {
      return res.status(400).json({ message: "This email is already in use." });
    }

    // Hash le mot de passe de l'utilisateur
    bcrypt.hash(req.body.password, 10, async (err, hash) => {
      if (err) {
        res.status(500).send(err);
      } else {
        const user = await User.findByIdAndUpdate(
          req.user._id,
          { ...req.body, password: hash, updatedAt: new Date() },
          { new: true }
        );
        res.status(200).send(user);
      }
    });

  } catch (error) {
    console.log(error);
    res.status(400).json({ error });
  }
};

exports.deleteUsers = async (req, res) => {
  const userId = req.user._id;

  try {
    // Vérifiez si le mot de passe envoyé dans la requête correspond au mot de passe hashé de l'utilisateur
    bcrypt.compare(
      req.body.password,
      req.user.password,
      async (err, result) => {
        if (err) {
          res.status(500).send(err);
        } else if (!result) {
          res.status(401).send({ message: "Incorrect Password" });
        } else {
          const user = await User.deleteOne({ _id: userId });
          res.send(user);
        }
      }
    );
  } catch (error) {
    res.status(400).json({ error: "You don't have the permission" });
  }
};