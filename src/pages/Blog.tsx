// // Blog.tsx - Display all saved blogs
// import { useState, useEffect } from "react";

// interface Blog {
//   title: string;
//   image: string;
//   description: string;
// }

// const Blog = () => {
//   const [blogs, setBlogs] = useState<Blog[]>([]);

//   useEffect(() => {
//     const savedBlogs = JSON.parse(localStorage.getItem("blogs") || "[]");
//     setBlogs(savedBlogs);
//   }, []);

//   return (
//     <div className="container mx-auto p-6">
//       <h1 className="text-3xl font-bold mb-6 text-center">Latest Blogs</h1>
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//         {blogs.length === 0 ? (
//           <p className="text-center col-span-3">No blogs available.</p>
//         ) : (
//           blogs.map((blog, index) => (
//             <div key={index} className="border p-4 rounded-lg shadow-lg">
//               <img src={blog.image} alt={blog.title} className="w-full h-48 object-cover rounded-md" />
//               <h2 className="text-xl font-semibold mt-4">{blog.title}</h2>
//               <p className="text-gray-600 mt-2">{blog.description}</p>
//             </div>
//           ))
//         )}
//       </div>
//     </div>
//   );
// };

// export default Blog;

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface Blog {
  id: number;
  title: string;
  image: string;
  description: string;
  content: string;
}

const Blog = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);

  useEffect(() => {
    fetch("/blogs.json")
      .then((res) => res.json())
      .then((data) => setBlogs(data))
      .catch((err) => console.error("Error loading blogs:", err));
  }, []);

  const getShortDescription = (text: string) => {
    return text.split(" ").slice(0, 15).join(" ") + "...";
  };

  return (
    <>
    <Navbar/>
    <><br></br></>
    <div className="container mx-auto p-6 mt-10">
      <h1 className="text-3xl font-bold mb-6 text-center">Latest Blogs</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {blogs.length === 0 ? (
          <p className="text-center col-span-3">No blogs available.</p>
        ) : (
          blogs.map((blog) => (
            <Link
              key={blog.id}
              to={`/blogs/${blog.id}`}
              className="border p-4 rounded-lg shadow-lg hover:shadow-xl transition"
            >
              <img
                src={blog.image}
                alt={blog.title}
                className="w-full h-48 object-cover rounded-md"
              />
              <h2 className="text-xl font-semibold mt-4">{blog.title}</h2>
              <p className="text-gray-600 mt-2">{getShortDescription(blog.description)}</p>
            </Link>
          ))
        )}
      </div>
    </div>
    <br></br>
    <br></br>
    <br></br>
    <br></br>
    <br></br>
    <Footer/>
    </>
  );
};

export default Blog;
