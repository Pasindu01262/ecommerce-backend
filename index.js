// backend/index.js
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

const app = express();
const port = 4000;

// Middleware
app.use(express.json());
app.use(cors());
app.use("/image", express.static(path.join(__dirname, "upload/image")));

// MongoDB connection
mongoose.connect(
  "mongodb+srv://pasindukossinna:3R694mM2ivKr4rXw@cluster0.4i5eya2.mongodb.net/Ecommerce-web"
)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log("MongoDB Error:", err));

// Multer storage for images
const storage = multer.diskStorage({
  destination: path.join(__dirname, "upload/image"),
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage: storage });

// Product Schema
const productSchema = new mongoose.Schema({
  id: Number,
  name: String,
  image: String,
  category: String,
  new_price: Number,
  old_price: Number,
  date: { type: Date, default: Date.now },
  available: { type: Boolean, default: true },
});
const Product = mongoose.model("Product", productSchema);

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  cartData: Object,
  date: { type: Date, default: Date.now },
});
const User = mongoose.model("User", userSchema);

// Root route
app.get("/", (req, res) => res.send("Express App is Running"));

// Upload route
app.post("/upload", upload.single("product"), (req, res) => {
  if (!req.file) return res.json({ success: 0, message: "No file uploaded" });
  res.json({ success: 1, image_url: `http://localhost:${port}/image/${req.file.filename}` });
});

// Add product
app.post("/addproduct", async (req, res) => {
  try {
    const lastProduct = await Product.findOne().sort({ id: -1 });
    const id = lastProduct ? lastProduct.id + 1 : 1;

    const newProduct = new Product({
      id,
      name: req.body.name,
      image: req.body.image,
      category: req.body.category,
      new_price: req.body.new_price,
      old_price: req.body.old_price,
    });

    await newProduct.save();
    res.json({ success: true, message: "Product Added Successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete product
app.post("/removeproduct", async (req, res) => {
  try {
    const deleted = await Product.findOneAndDelete({ id: req.body.id });
    if (!deleted) return res.json({ success: false, message: "Product not found" });
    res.json({ success: true, message: "Product Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all products
app.get("/allproduct", async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get new collection (last 8 products)
app.get("/newcollectiond", async (req, res) => {
  try {
    const products = await Product.find({}).sort({ date: -1 }).limit(8);
    res.json(products);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Popular in women
app.get("/popularinwomen", async (req, res) => {
  try {
    const products = await Product.find({ category: "women" });
    res.json(products);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Signup route
app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ success: false, error: "Missing fields" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ success: false, error: "User with this email already exists" });

    const cart = {};
    for (let i = 0; i <= 300; i++) cart[i] = 0;

    const user = new User({ name: username, email, password, cartData: cart });
    await user.save();

    const token = jwt.sign({ user: { id: user._id } }, "secret_ecom");
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Login route
app.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.json({ success: false, error: "Wrong Email ID" });
    if (user.password !== req.body.password)
      return res.json({ success: false, error: "Wrong Password" });

    const token = jwt.sign({ user: { id: user._id } }, "secret_ecom");
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//creating middlware to fetch user
const fetchUder=async(req,res,next)=>{
    const token=req.header('auth-token');
    if(!token)
    {
      res.status(401).send({errors:"please authenticate using value"})
    }
    else
    {
      try{
          const data=jwt.verify(token,'secret_ecom');
          req.user=data.user;
          next();
      }catch(error)
      {
          res.status(401).send({errors:"please authenticate using a valid token"})
      }
    }
}

app.post('/addtocart',fetchUder,async(req,res)=>{
  console.log("Added",req.body.itemId);
    let userData=await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId]+=1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Added")
})

//creating endpoint to remove product from cartdata
app.post('/removefromcart',fetchUder,async(req,res)=>{
  console.log("remove",req.body.itemId);
     let userData=await Users.findOne({_id:req.user.id});
     if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId]-=1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Remove")
})

//creating endpoint to get cartdata
app.post('/getcart',fetchUder,async(req,res)=>{
    console.log("GetCart");
    let userData=await Users.findOne({id:req.user.id});
    res.json(userData.cartData);
})

// Start server
app.listen(port, () => console.log(`Server running on port ${port}`));














