import React from 'react';
import { useNavigate } from 'react-router-dom';
import './CategorySelect.css'; // ✅ import the CSS

function CategorySelect() {
  const navigate = useNavigate();

  const categories = ['Sports', 'History', 'Science', 'Cinema'];

  const handleCategoryClick = (category) => {
    navigate(`/quiz/${category}`);
  };

  return (
    <div className="category-container">
      <h2>Select a Category</h2>
      <div className="category-buttons">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => handleCategoryClick(cat)}
            className="category-button"
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}

export default CategorySelect;
