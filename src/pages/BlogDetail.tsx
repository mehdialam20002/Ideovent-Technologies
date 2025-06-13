import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";

import { Link } from "react-router-dom";
interface Blog {
  id: number;
  title: string;
  image: string;
  content: string;
}

const BlogDetail = () => {
  const { id } = useParams();
  const [blog, setBlog] = useState<Blog | null>(null);

  useEffect(() => {
    fetch("/blogs.json")
      .then((res) => res.json())
      .then((data) => {
        const found = data.find((b: Blog) => b.id === Number(id));
        setBlog(found || null);
      });
  }, [id]);

  if (!blog) {
    return <div className="text-center mt-10 text-xl text-gray-500">Blog not found.</div>;
  }

  return (
    <>
    <Navbar/>
    <br></br>
    <br></br>
    <br></br>
    <motion.div
      className="max-w-4xl mx-auto px-4 py-8"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.img
        src={blog.image}
        alt={blog.title}
        className="w-full h-[300px] md:h-[400px] object-cover rounded-2xl shadow-lg mb-8"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      />

      <motion.h1
        className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        {blog.title}
      </motion.h1>

      <motion.div
  className="prose prose-lg max-w-none text-gray-800 leading-relaxed"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ delay: 0.6, duration: 0.6 }}
  dangerouslySetInnerHTML={{ __html: blog.content }}
/>
    </motion.div>
    <Footer/>
    </>
  );
};

export default BlogDetail;
