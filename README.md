# Lab-09-back-end
back end for city explorer app, adding SQL database

# Project Name

**Author**: Jagdeep Singh, Trey Herndon, Bonnie Wang, Juliann Talkington
**Version**: 1.0.0 (increment the patch/fix version number if you make more commits past your first submission)

## Overview
<!-- Provide a high level overview of what this application is and why you are building it, beyond the fact that it's an assignment for this class. (i.e. What's your problem domain?) -->
This site is being built so that we can get hands on experience with backend systems and produce an server that pulls from multiple databases and updates the information pulled regularly.

## Getting Started

  step 1: Clone the repository
  
  step 2: Make sure npm is installed
  
  Step 3: In terminal/command prompt, enter 'npm i' 
  
  step 4: Create a '.env' file containing the following
        PORT=[port number]
        
        DARK_SKY_API_KEY=[your api key]
        GOOGLE_MAPS_API_KEY=[your api key] 
        MEETUP_API_KEY=[your api key]
        YELP_API_KEY=[your api key]
        MOVIE_DB_API_KEY=[your api key]

        DATABASE_URL=[your postgres database url (OS dependant)]
  
  step 5: Run nodemon and test routes (location, weather, meetups, yelp, movies) and outputs.
  
  step 6: deploy to a online service like heroku if desired. make sure to add postgres to online service as well

## Architecture

Technologies used:

  - JavaScript
  - node.js
  - express
  - dotEnv
  - JSON
  - CORS
  - superagent
  - PostgreSQL
  - pg 

## Change Log

03-19-2019: Application has functional location and weather route, data retrieved from APIs

03-20-2019: Refactored code for location and weather route, and added a meetups route for getting local meetup events

03-21-2019: Added sql database for data recieved from APIs for location, weather and meetups route. Deployed to heroku with postgresql.

03-22-2019: Added cache invalidation for database data. Also added routes /movies and /yelp

## Credits and Collaborations

Jagdeep Singh, Trey Herndon, Bonnie Wang, Juliann Talkington

-->
Credit should be given to CodeFellows for providing all of the frontend javascript, html, and CSS. CodeFellows also gave guidance on the creation of the backend portion.


### Part 1: Jagdeep Singh and Trey Herndon 

Number and name of feature: #1: Locations Route

- Estimate of time needed to complete: 1 hour
- Start time: 9am
- Finish time: 10am
- Actual time needed to complete: 1 hour

Number and name of feature: #2: Weather Route

- Estimate of time needed to complete: 1 hour
- Start time: 10am
- Finish time: 11:15am
- Actual time needed to complete: 1:15 minutes

Number and name of feature: #3: Error Handling

- Estimate of time needed to complete: 1 hour
- Start time: 11:15am
- Finish time: 12:20pm
- Actual time needed to complete: 1:05 minutes


### Part 2: Bonnie Wang and Jagdeep Singh

Number and name of feature: #1: Data Formatting (constructors)

- Estimate of time needed to complete: 20 mins
- Start time: 8:30am
- Finish time: 8:55am
- Actual time needed to complete: 25 mins


Number and name of feature: #2: Locations route refactor

- Estimate of time needed to complete: 30 mins
- Start time: 9:00am
- Finish time: 9:30am
- Actual time needed to complete: 30 mins


Number and name of feature: #3: Weather route refactor

- Estimate of time needed to complete: 30 mins
- Start time: 9:40am
- Finish time: 9:55am
- Actual time needed to complete: 15 mins


Number and name of feature: #4: Meetups route

- Estimate of time needed to complete: 50 mins
- Start time: 10:00am
- Finish time: 10:30am
- Actual time needed to complete: 30 mins

### Part 3: Juliann Talkington and Jagdeep Singh

Number and name of feature: #1: Database Setup

- Estimate of time needed to complete: 30mins
- Start time: 9:05 am
- Finish time: 9:25 am
- Actual time needed to complete: 20 mins


Number and name of feature: #2: Location Route SQL Interaction

- Estimate of time needed to complete: 60mins
- Start time: 9:25 am
- Finish time: 10:20 am
- Actual time needed to complete: 55 mins

Number and name of feature: #2: Weather Route SQL Interaction

- Estimate of time needed to complete: 60mins
- Start time: 10:20 am
- Finish time: 11:25 am
- Actual time needed to complete: 65 mins

Number and name of feature: #2: Meetups Route SQL Interaction

- Estimate of time needed to complete: 60mins
- Start time: 11:35 am
- Finish time: 12:30 pm
- Actual time needed to complete: 55 mins


Number and name of feature: #3: Add Database to Heroku Deployment

- Estimate of time needed to complete: 60mins
- Start time: 12:30 pm
- Finish time: 2:00 pm
- Actual time needed to complete: 40 mins, took break

### Part 4: Juliann Talkington and Jagdeep Singh

Number and name of feature: #1: Add cache invalidation

- Estimate of time needed to complete: 1h:30m
- Start time: 9:20am
- Finish time: 11:00am
- Actual time needed to complete: 1h:40m

Number and name of feature: #2: Add Movies route

- Estimate of time needed to complete: 60mins
- Start time: 11:00am
- Finish time: 11:50am
- Actual time needed to complete: 50mins

Number and name of feature: #3: Add Yelp route

- Estimate of time needed to complete: 40mins
- Start time: 12:00pm
- Finish time: 12:30pm
- Actual time needed to complete: 30 mins

Number and name of feature: #4: Add Trails route

- Estimate of time needed to complete: 
- Start time:
- Finish time:
- Actual time needed to complete: