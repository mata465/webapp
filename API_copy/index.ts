import "dotenv/config";
import express from "express";
import "express-async-errors";
import mongoose, { Schema, model } from "mongoose";
import { Request, Response, NextFunction } from "express";

const app = express();
app.use(express.json());

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI is not defined");
}
const db = mongoose.connect(process.env.MONGO_URI);

app.get("/seed", async (req, res) => {
  await User.deleteMany({});
  await Template.deleteMany({});
  const user = new User({
    name: "John Doe",
    email: "john@email.com",
    password: "123456",
  });
  const template = new Template({
    name: "Template 1",
    description: "This is a template",
    user: user._id,
    questions: [
      {
        name: "Question 1",
        type: "text",
        required: true,
      },
      {
        name: "Question 2",
        type: "number",
        required: true,
      },
      {
        name: "Question 3",
        type: "boolean",
        required: true,
      },
      {
        name: "Question 4",
        type: "select",
        options: [
          {
            display: "Option 1",
            value: "option1",
          },
          {
            display: "Option 2",
            value: "option2",
          },
        ],
        required: false,
      },
    ],
  });

  await user.save();
  await template.save();

  const users = await User.find();
  const templates = await Template.find();

  const result = [...templates, ...users];
  res.json(result);
});

//#region TEMPLATES
const questionOptionSchema = createSchema({
  display: { type: String, required: true },
  value: { type: String, required: true },
});
const questionSchema = createSchema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ["text", "number", "boolean", "select", "radio", "image", "audio"],
    required: true,
  },
  options: {
    type: [questionOptionSchema],
    required: function (this: any) {
      return ["select", "radio"].includes(this.type);
    },
    default: undefined,
  },
  required: Boolean,
});
const template = createSchema({
  createdAt: { type: Date, default: Date.now },
  name: { type: String, required: true },
  description: String,
  userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
  areaId: { type: Schema.Types.ObjectId, ref: "area", required: true },
  questions: [questionSchema],
});
const Template = model("template", template);

// Create a template
app.post("/templates", async (req, res) => {
  const body = req.body;
  const template = new Template(body);
  await template.save();
  res.json(template);
});

// Get all answers for a template
app.get("/templates/:id/answers", async (req, res) => {
  const templateId = req.params.id;
  const answers = await Answer.find({ templateId });
  res.json(answers);
});

// Get a template
app.get("/templates/:id", async (req, res) => {
  const id = req.params.id;

  const template = await Template.findById(id);
  res.json(template);
});

// Get all templates
app.get("/templates", async (req, res) => {
  const templates = await Template.find();
  res.json(templates);
});

// Delete a template
app.delete("/templates/:id", async (req, res) => {
  const id = req.params.id;
  const template = await Template.findByIdAndDelete(id);
  res.json(template);
});

//#endregion TEMPLATES

//#region ANSWERS
const answerSchema = createSchema({
  title: String,
  userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
  createdAt: { type: Date, default: Date.now },
  templateId: { type: Schema.Types.ObjectId, ref: "template", required: true },
  responses: { type: Schema.Types.Map, of: String, required: true },
});
const Answer = model("answer", answerSchema);

// Create an answer
app.post("/answers", async (req, res) => {
  const body = req.body;
  const answer = new Answer(body);
  await answer.save();
});

// Get all answers
app.get("/answers", async (req, res) => {
  const answers = await Answer.find();
  res.json(answers);
});

// Get an answer
app.get("/answers/:id", async (req, res) => {
  const id = req.params.id;
  const answer = Answer.findById(id);
  res.json(answer);
});

app.delete("/answers/:id", async (req, res) => {
  const id = req.params.id;
  const answer = await Answer.findByIdAndDelete(id);
  res.json(answer);
});
//#endregion ANSWERS

//#region AREAS
const areaSchema = createSchema({
  coordinates: [[Number]],
  name: String,
});
const Area = model("area", areaSchema);

// Create an area
app.post("/areas", async (req, res) => {
  const body = req.body;
  const area = new Area(body);
  await area.save();
  res.json(area);
});

// Get all areas
app.get("/areas", async (req, res) => {
  const areas = await Area.find();
  res.json(areas);
});

// Get an area
app.get("/areas/:id", async (req, res) => {
  const id = req.params.id;
  const area = await Area.findById(id);
  res.json(area);
});

// Get all templates for an area
app.get("/areas/:id/templates", async (req, res) => {
  const areaId = req.params.id;
  const tenplates = await Template.find({ areaId });
  res.json(tenplates);
});

app.delete("/areas/:id", async (req, res) => {
  const id = req.params.id;
  const area = await Area.findByIdAndDelete(id);
  res.json(area);
});
//#endregion AREAS

//#region USERS
const userSchema = createSchema({
  createdAt: { type: Date, default: Date.now },
  name: String,
  email: String,
  password: String,
});
const User = model("user", userSchema);

app.post("/users", async (req, res) => {
  const body = req.body;
  const user = new User(body);
  await user.save();
  res.json(user);
});

app.get("/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

app.get("/users/:id", async (req, res) => {
  const id = req.params.id;
  const user = await User.findById(id);
  res.json(user);
});

app.delete("/users/:id", async (req, res) => {
  const id = req.params.id;
  const user = await User.findByIdAndDelete(id);
  res.json(user);
});
//#endregion USERS

//#region HELPERS
function createSchema(definition: any) {
  const schema = new Schema(definition);

  schema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform: (_, ret) => {
      delete ret._id;
    },
  });

  return schema;
}
//#endregion HELPERS

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).send(err.message);
  }
  next(err);
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
