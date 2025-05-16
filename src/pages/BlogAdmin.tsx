import { useState } from "react";

const AdminBlog = () => {
  const [blog, setBlog] = useState({
    title: "",
    image: "", // This will now hold base64 string
    description: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBlog({ ...blog, [name]: value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBlog((prev) => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blog.title || !blog.image || !blog.description) {
      alert("All fields are required!");
      return;
    }
    const existingBlogs = JSON.parse(localStorage.getItem("blogs") || "[]");
    const updatedBlogs = [blog, ...existingBlogs];
    localStorage.setItem("blogs", JSON.stringify(updatedBlogs));
    alert("Blog added successfully!");
    setBlog({ title: "", image: "", description: "" });
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Add New Blog</h1>
      <form
        onSubmit={handleSubmit}
        className="max-w-lg mx-auto bg-white p-6 shadow-md rounded-lg"
      >
        <label className="block mb-4">
          <span className="text-gray-700">Title</span>
          <input
            type="text"
            name="title"
            value={blog.title}
            onChange={handleChange}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            placeholder="Enter blog title"
          />
        </label>

        <label className="block mb-4">
          <span className="text-gray-700">Upload Image</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
          />
        </label>

        {blog.image && (
          <div className="mb-4">
            <span className="text-gray-700 block mb-2">Preview:</span>
            <img src={blog.image} alt="Preview" className="w-full max-h-64 object-contain rounded" />
          </div>
        )}

        <label className="block mb-4">
          <span className="text-gray-700">Description</span>
          <textarea
            name="description"
            value={blog.description}
            onChange={handleChange}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            placeholder="Enter blog description"
          ></textarea>
        </label>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition"
        >
          Submit Blog
        </button>
      </form>
    </div>
  );
};

export default AdminBlog;
