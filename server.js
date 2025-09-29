const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const validator = require("validator");
const multer = require('multer');
const path = require('path');
const sanitizeHtml = require("sanitize-html");

const app = express();
const port = 5000;

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');

app.use(express.static('public'));

app.use('/uploads', express.static('uploads'));

app.use(flash());

// Session must come before flash
app.use(session({
  secret: "mySecretKey",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 // 1 hour
  }
}));

// Make flash messages available to all views
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  next();
});

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // where to store files
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // keep original file extension
  }
});

const upload = multer({ storage: storage });


app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});
app.use((req, res, next) => {
  res.locals.admin = req.session.admin || null;
  next();
});


const uri = 'mongodb+srv://Breezy:MONGOdbatlass2025@francisdb.1dakl.mongodb.net/francisBlog?retryWrites=true&w=majority&appName=FrancisDB';

 mongoose.connect(uri).then(()=>  
  console.log('DB Connected Successfully.')).catch(err => 
  console.error("Connection Error:", err));

const User = require("./models/user");
const Admin = require("./models/admin");
const Category = require("./models/category");
const Post = require("./models/post");
const Visitor = require("./models/visitor");

app.use(async (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    await Visitor.updateOne(
      { ip },
      { $setOnInsert: { ip, firstVisit: new Date() } },
      { upsert: true } // only insert if not found
    );
  } catch (err) {
    console.error("Error logging visitor:", err.message);
  }

  next();
});

app.get("/", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).limit(3);
    res.render("index", { posts });
  } catch (err) {
    console.error(err);
    res.render("index", { posts: [] }); 
  }
});

app.get('/categories',(req,res)=>{
    if(!req.session.user){
    req.flash("error_msg", "Log in first to continue!");
    return res.redirect('/login');
    }
    res.render('categories');
})
app.get('/about',(req,res)=>{
    res.render('about');
})
app.get('/contact',(req,res)=>{
    res.render('contact');
})
app.get('/admin',(req,res)=>{
    res.render('admin');
})
app.get('/login',(req,res)=>{
    res.render('login');
})
app.get('/profile',(req,res)=>{
    if(!req.session.user){
    return res.redirect('/login');
    }
    res.render('profile');
})

app.post("/profile/update", upload.single("profilePhoto"), async (req, res) => {
  try {
    const { names, email } = req.body;
    const userId = req.session.user._id;

    let updateFields = { names, email };

    if (req.file) {
      updateFields.profilePhoto = req.file.filename;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true }
    );

    req.session.user = updatedUser;

    // Add success message
    req.flash("success_msg", "Profile updated successfully!");
    res.redirect("/profile");
  } catch (err) {
    console.error("Profile update error:", err);

    // Add error message
    req.flash("error_msg", "Something went wrong! Please try again.");
    res.redirect("/profile");
  }
});

app.get('/change-password',(req,res)=>{
    res.render('change-password');
})
app.get('/cooladmin/login',(req,res)=>{
    res.render('CoolAdmin/admin-login');
})
app.get('/cooladmin/register',(req,res)=>{
    res.render('CoolAdmin/admin-register');
})

app.get('/cooladmin',async (req,res)=>{
    if(!req.session.admin){
      req.flash("error_msg", "Log in as admin first to access your Dashboard!");
      return res.redirect('/cooladmin/login');
    }
   try {
    const [totalUsers, totalCategories, totalPosts, uniqueVisitors ] = await Promise.all([
      User.countDocuments(),
      Category.countDocuments(),
      Post.countDocuments(),
      Visitor.countDocuments()
    ]);

    res.render("CoolAdmin/index", {
      totalUsers,
      totalCategories,
      totalPosts,
      uniqueVisitors
    });
  } catch (err) {
    console.error("Error fetching dashboard stats:", err.message);
    res.render("cooladmin/index", {
      totalUsers: 0,
      totalCategories: 0,
      totalPosts: 0
    });
  }
})


// #SIGN UP
app.post('/signup', upload.single('profile_photo'), async (req, res) => {
  try {
    const { names, email, password, confirm_pass } = req.body;

    if (password !== confirm_pass) {
      return res.status(400).json({ error: 'Password and Confirm-password do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password length must be 6 characters or greater' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    //  Ensure profile photo is uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'Profile photo is required' });
    }

    const hashedPass = await bcrypt.hash(password, 10);

    const newUser = new User({
      names: names,
      email: email,
      password: hashedPass,
      profilePhoto: req.file.filename  // <-- save file name in DB
    });

    await newUser.save();
    console.log('User Added Successfully!');

    res.render('registered-successfully', { User: names });

  } catch (err) {
    console.error(err);

    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    res.status(500).json({ error: 'Server error, please try again later.' });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }); 
    if (!user) {
      req.flash("error_msg", "User not found");
      return res.redirect("/login");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash("error_msg", "Invalid password");
      return res.redirect("/login");
    }

    req.session.user = user;
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});




// ADMIN REG
app.post('/reg-admin', async (req,res) => {
   try {
    const {username,email,password} = req.body;

    const hashedPass = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
      username:username,
      email:email,
      password:hashedPass
    })
    await newAdmin.save();
  // Success flash + redirect
    req.flash(
      'success_msg',
      'Admin account created successfully! Please log in to continue.'
    );
    res.redirect('/cooladmin/login');
   }catch (err){
     console.error(err);
   }
})

// # ADMIN LOGIN
app.post('/log-admin', async (req,res)=>{
    const {email,password} = req.body;
   
    try{
      const admin = await Admin.findOne({email:email});
      if(!admin){
        return console.log('USER NOT FOUND!');
      }
      const isMatch = await bcrypt.compare(password,admin.password);
      if(!isMatch){
        return console.log('INVALID PASSWORD');
      }
      req.session.admin = admin; 
      res.redirect('/cooladmin');

    }catch (err) {
     console.error(err);
    }
})

app.get('/cooladmin/admin-profile', (req , res) =>{
  if(!req.session.admin){
    return res.redirect('CoolAdmin/admin-login')
  }
  const loggedAdmin = req.session.admin ;
  res.render('CoolAdmin/admin-profile', {loggedAdmin});
})

app.post('/update-admin-profile', async (req, res) => {
  try {
    const { names, email, password } = req.body;

    const adminId = req.session.admin._id;

    // Hash password if provided
    let updateFields = { names, email };
    if (password && password.trim() !== "") {
      updateFields.password = await bcrypt.hash(password, 10);
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      updateFields,
      { new: true }
    );

    req.session.admin = updatedAdmin;

    // Flash success
    req.flash("success_msg", "Admin Profile updated successfully!");
    res.redirect("/cooladmin/admin-profile");

  } catch (err) {
    console.error("Profile update error:", err);
    req.flash("error_msg", "Something went wrong! Please try again.");
    res.redirect("/cooladmin/admin-profile");
  }
});

// app.get("/cooladmin/posts", (req, res) => {
//       if (!req.session.admin) {
//        return res.redirect("/cooladmin"); 
//       }
//     res.render('CoolAdmin/manage-posts');
// });
app.get("/cooladmin/users", async (req, res) => {
    if(!req.session.admin){
      return res.redirect('/cooladmin');
    }
    const users = await User.find(); 
    res.render("CoolAdmin/users", { users });
});
app.get("/cooladmin/categories", async (req, res) => {
    if(!req.session.admin){
      return res.redirect('/cooladmin');
    }
    const categories = await Category.find(); 
    res.render('CoolAdmin/categories',{categories});
});

app.get("/cooladmin/add-category", async (req, res) => {
    if(!req.session.admin){
      return res.redirect('/cooladmin');
    }
    res.render('CoolAdmin/add-category');
    // const users = await Category.find(); 
    // res.render("CoolAdmin/users", { users });
});

app.post("/categories/add", async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/cooladmin"); 
  }

  const { category } = req.body;

  try {
    const newCat = new Category({
      categoryName: category.trim(),
    });

    await newCat.save();
    req.flash("success_msg", "Category added successfully!");
    res.redirect("/cooladmin/categories");
  } catch (err) {
    req.flash("error_msg", "Error adding Category!");
    res.redirect("/cooladmin/categories");
  }
});

app.get("/cooladmin/delete-category/:id", async (req, res) => {
    if (!req.session.admin) {
    return res.redirect("/cooladmin"); 
  }
   try {
    await Category.findByIdAndDelete(req.params.id);
    req.flash('success_msg','Deleted category successfully!');
    res.redirect("/cooladmin/categories");
   }catch(err){
    console.error("Error deleting category:", err.message);
    req.flash('error_msg','Error deleting category!');
    res.redirect("/cooladmin/categories");
   }
});

app.get("/cooladmin/edit-category/:id", async (req, res) => {
    if (!req.session.admin) {
    return res.redirect("/cooladmin"); 
  }
   try {
    const foundCategory = await Category.findById(req.params.id);
    res.render('CoolAdmin/edit-category',{foundCategory});
   }catch(err){
    console.error("Error retrieving category:", err.message);
    req.flash('error_msg','Error retrieving category!');
    res.redirect("/cooladmin/categories");
   }
});

app.post("/cooladmin/categories/update/:id", async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/cooladmin");
  }

  try {
    const { categoryName } = req.body;

    await Category.findByIdAndUpdate(
      req.params.id,
      { categoryName: categoryName },
      { new: true }
    );

    req.flash("success_msg", "Category updated successfully!");
    res.redirect("/cooladmin/categories");
  } catch (err) {
    console.error("Error updating category:", err.message);
    req.flash("error_msg", "Error updating category!");
    res.redirect("/cooladmin/categories");
  }
});

app.get("/cooladmin/edit-user/:id", async (req, res) => {
    if (!req.session.admin) {
    return res.redirect("/cooladmin"); 
  }
   try {
    const foundUser = await User.findById(req.params.id);
    res.render('CoolAdmin/edit-user',{foundUser});
   }catch(err){
    console.error("Error retrieving user:", err.message);
    req.flash('error_msg','Error retrieving user!');
    res.redirect("/cooladmin/users");
   }
});

app.post("/cooladmin/users/update/:id", upload.single("profilePhoto"), async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/cooladmin");
  }

  try {
    const { fullnames, email } = req.body;

    // Base update data
    let updateData = {
      names: fullnames,
      email: email
    };

    if (req.file) {
      updateData.profilePhoto = req.file.filename;
    }

    await User.findByIdAndUpdate(req.params.id, updateData, { new: true });

    req.flash("success_msg", "User updated successfully!");
    res.redirect("/cooladmin/users");
  } catch (err) {
    console.error("Error updating user:", err.message);
    req.flash("error_msg", "Error updating user!");
    res.redirect("/cooladmin/users");
  }
});

app.get("/cooladmin/add-post", async (req, res) => {
    if(!req.session.admin){
      return res.redirect('/cooladmin');
    }
    res.render('cooladmin/add-post');
});

app.get("/cooladmin/manage-posts", async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/cooladmin");
  }

  try {
    const posts = await Post.find({}).sort({ createdAt: -1 });
    res.render("CoolAdmin/manage-posts", { posts }); 
   
  } catch (err) {
    console.error("Error fetching posts:", err.message);
    req.flash("error_msg", "Could not fetch posts");
    res.redirect("/cooladmin");
  }
});

app.post("/posts/add", upload.single("blogImage"), async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/cooladmin");
  }

  try {
    // Sanitize text inputs
    const title = sanitizeHtml(req.body.title.trim());
    const subtitle = sanitizeHtml(req.body.subTitle.trim());
    const author = sanitizeHtml(req.body.author.trim());
    const category = sanitizeHtml(req.body.category.trim());

    if (!req.file || !title || !subtitle || !author || !category) {
      req.flash("error_msg", "All fields including image are required!");
      return res.redirect("/cooladmin/add-post");
    }

    // Save post
    const newPost = new Post({
      blogImage: req.file.filename,  
      blogTitle: title,
      subTitle: subtitle,
      author,
      category
    });

    await newPost.save();

    req.flash("success_msg", "Post added successfully!");
    res.redirect("/cooladmin/manage-posts");
  } catch (err) {
    console.error("Error adding post:", err.message);
    req.flash("error_msg", "Error adding post!");
    res.redirect("/cooladmin/add-post");
  }
});


app.get("/cooladmin/posts/edit-post/:id", async (req, res) => {
    if (!req.session.admin) {
    return res.redirect("/cooladmin"); 
  }
   try {
    const post = await Post.findById(req.params.id);
    res.render('CoolAdmin/edit-post',{post});
   }catch(err){
    console.error("Error retrieving post:", err.message);
    req.flash('error_msg','Error retrieving post!');
    res.redirect("/cooladmin/manage-posts");
   }
});

app.post(
  "/cooladmin/posts/update/:id",
  upload.single("blogImage"),
  async (req, res) => {
    if (!req.session.admin) {
      return res.redirect("/cooladmin");
    }

    try {
      const { blogTitle, subTitle, author, category } = req.body;

      const updatedFields = {
        blogTitle,
        subTitle,
        author,
        category,
      };

      if (req.file) {
        updatedFields.blogImage = req.file.filename;
      }

      await Post.findByIdAndUpdate(req.params.id, updatedFields, { new: true });

      req.flash("success_msg", "Blog post updated successfully!");
      res.redirect("/cooladmin/manage-posts");
    } catch (err) {
      console.error("Error updating post:", err.message);
      req.flash("error_msg", "Error updating post!");
      res.redirect("/cooladmin/manage-posts");
    }
  }
);

app.get("/cooladmin/posts/delete-post/:id", async (req, res) => {
    if (!req.session.admin) {
    return res.redirect("/cooladmin"); 
  }
   try {
    await Post.findByIdAndDelete(req.params.id);
    req.flash('success_msg','Deleted post successfully!');
    res.redirect("/cooladmin/manage-posts");
   }catch(err){
    console.error("Error deleting post:", err.message);
    req.flash('error_msg','Error deleting post!');
    res.redirect("/cooladmin/manage-posts");
   }
});




app.get("/cooladmin/form", async (req, res) => {

    res.render('CoolAdmin/form-basic');

});




app.get("/dashboard", (req, res) => {
  if (req.session.user) {
    res.send(`Welcome back, ${req.session.user.names}`);
  } else {
    res.send("Please log in first.");
  }
});


app.get("/tableONe", (req, res) => {
    res.render('CoolAdmin/table-bootstrap-basic.ejs');
});
app.get("/tableTwo", (req, res) => {
    res.render('CoolAdmin/table-datatable-basic.ejs');
});

// LOGOUT
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.render('logout');
});

//ADMIN LOGOUT
app.get("/cooladmin/logout-admin", (req, res) => {
  req.session.destroy();
  console.log('Admin logged out successfully!')
  res.send("<script>alert('Admin logged out'); window.location = '/cooladmin/login';</script>");
});


app.listen(port, () => { 
    console.log(`Server started at port ${port}.`);
 })
