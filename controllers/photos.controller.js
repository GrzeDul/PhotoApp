const Photo = require('../models/photo.model');
const sanitize = require('mongo-sanitize');
const Voter = require('../models/Voter.model');

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {
  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;
    const emailRE = new RegExp(/[a-z0-9]{2,20}@[a-z0-9]{2,20}\.[a-z0-9]{2,5}/i);
    const titleRE = new RegExp(/[a-z'"\-\s]{2,25}/i);
    const authorRE = new RegExp(/[a-z'"\-\s]{2,50}/i);
    const extensions = ['jpg', 'png', 'gif'];
    const ext = file.path.split('.').slice(-1)[0];

    if (
      title.match(titleRE).join('').length === title.length &&
      author.match(authorRE).join('').length === author.length &&
      email.match(emailRE).length === 1 &&
      file &&
      extensions.includes(ext)
    ) {
      // if fields are not empty and have common symbols

      const fileName = file.path.split('/').slice(-1)[0]; // cut only filename from full path, e.g. C:/test/abc.jpg -> abc.jpg
      const newPhoto = new Photo({
        title: sanitize(title),
        author: sanitize(author),
        email: sanitize(email),
        src: fileName,
        votes: 0,
      });
      await newPhoto.save(); // ...save new photo in DB
      res.json(newPhoto);
    } else {
      throw new Error('Wrong input!');
    }
  } catch (err) {
    res.status(500).json(err);
  }
};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {
  try {
    res.json(await Photo.find());
  } catch (err) {
    res.status(500).json(err);
  }
};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {
  const alreadyVoted = 'Already voted!';
  try {
    const photoToUpdate = await Photo.findOne({ _id: req.params.id });
    const voter = await Voter.findOne({ user: req.connection.remoteAddress });
    if (!photoToUpdate) res.status(404).json({ message: 'Not found' });
    else {
      if (!voter) {
        const newVoter = new Voter({
          user: req.connection.remoteAddress,
          votes: [req.params.id],
        });
        await newVoter.save();
      } else {
        if (voter.votes.includes(req.params.id)) {
          throw new Error(alreadyVoted);
        } else {
          voter.votes.push(req.params.id);
          await voter.save();
        }
      }
      photoToUpdate.votes++;
      await photoToUpdate.save();
      res.send({ message: 'OK' });
    }
  } catch (err) {
    if (err.message === alreadyVoted) {
      res.status(400).json(err.message);
    } else {
      res.status(500).json(err);
    }
  }
};
