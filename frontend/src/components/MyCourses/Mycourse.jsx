import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./Mycourse.css";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";

const Mycourse = () => {
  const [courses, setCourses] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/courses/student/published-courses")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCourses(data.courses);
        } else {
          setError("Failed to load courses");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setError("Something went wrong");
        setLoading(false);
      });
  }, []);

  const visibleCourses = showAll ? courses : courses.slice(0, 2);

  return (
    <section className="tsp-programs-section">
      <div className="tsp-programs-header">
        <div className='tsp-llf'>
          <h5>Our Courses</h5>
          <h2>Tailored for Your Success</h2>
        </div>
        <div className='tsp-llr'>
        <p>
          At Tathagat, we offer comprehensive and specialized programs designed to help students excel
          in CAT, XAT, SNAP, GMAT, and other management entrance exams. Whether you're a beginner or
          looking for advanced training, we have the perfect program for you!
        </p>
        </div>
      </div>
      <div className="tsp-programs-actions">
        <button><i className="fa fa-filter"></i> CAT & OMET</button>
        <button><i className="fa fa-filter"></i> 2025</button>
        <button><i className="fa fa-filter"></i> Online</button>
        <button><i className="fa fa-balance-scale"></i> Course Comparison</button>
      </div>

      {loading ? (
        <p>Loading courses...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <div className="tsp-programs-grid">
          {visibleCourses.map((item) => (
            <div className="tsp-program-card" key={item._id}>
            <div className="tsp-program-image">
  <LazyLoadImage
    effect="blur"
    src={`/uploads/${item.thumbnail}`}
    alt={item.name}
  />
  <div className="tsp-badge">{item.name}</div>
</div>

              <div className="tsp-program-content">
                <h3>{item.name}</h3>
  <ul className="desc-list">
  {item.description
    ?.replace(/<[^>]+>/g, '') // Remove HTML tags
    .split('\n') // Split by new lines
    .filter(line => line.trim() !== "")
    .map((feat, idx) => (
      <li key={idx}>✔ {feat}</li>
    ))}
</ul>


                <div className="tsp-program-price-row">
                  <div>
                    <h4>₹{item.price}</h4>
                    {item.oldPrice && <del>₹{item.oldPrice}</del>}
                  </div>
                  <div className="tsp-program-buttons">
                    <button onClick={() => navigate("/course-purchase", { state: item })}>Enroll Now</button>
                    <button className="demo-btn">Book Free Demo Class</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!showAll && courses.length > 2 && (
        <div className="tsp-show-all-button">
          <button onClick={() => setShowAll(true)}>Show All</button>
        </div>
      )}
    </section>
  );
};

export default Mycourse;
