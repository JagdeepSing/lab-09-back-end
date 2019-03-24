DROP TABLE IF EXISTS weathers;
DROP TABLE IF EXISTS meetUps;
DROP TABLE IF EXISTS movies;
DROP TABLE IF EXISTS yelps;
DROP TABLE IF EXISTS trails;
DROP TABLE IF EXISTS locations;

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10,7),
  created_at BIGINT
);

CREATE TABLE weathers (
  id SERIAL PRIMARY KEY,
  forecast VARCHAR(255),
  time VARCHAR(255),
  created_at BIGINT,
  location_id INTEGER NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE meetups (
  id SERIAL PRIMARY KEY,
  link VARCHAR(512),
  name VARCHAR(255),
  creation_date VARCHAR(255),
  host VARCHAR(255),
  created_at BIGINT,
  location_id INTEGER NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE movies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(2083),
  overview TEXT,
  average_votes NUMERIC(10,7),
  total_votes INTEGER,
  image_url VARCHAR(2083),
  popularity NUMERIC(10,7),
  released_on VARCHAR(255),
  created_at BIGINT,
  location_id INTEGER NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE yelps (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  image_url VARCHAR(2083),
  price VARCHAR(255),
  rating NUMERIC(10,7),
  url VARCHAR(2083),
  created_at BIGINT,
  location_id INTEGER NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE trails (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  location VARCHAR(255),
  length NUMERIC(4,2),
  stars NUMERIC(4,2),
  star_votes INTEGER,
  summary VARCHAR(512),
  trail_url VARCHAR(512),
  conditions VARCHAR(255),
  condition_date VARCHAR(11),
  condition_time VARCHAR(10),
  created_at BIGINT,
  location_id INTEGER NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations (id)
);
-- to link schema to our database, in repo folder
-- "psql -f ./data/schema.sql -d city_explorer"