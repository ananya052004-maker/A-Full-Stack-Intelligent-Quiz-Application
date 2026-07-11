-- PostgreSQL schema for Quorum
-- Converted from the original MySQL schema.

DROP TABLE IF EXISTS quiz_attempts, quiz_questions, quizzes,
  presentation_slides, presentations,
  wordcloud_entries, wordclouds,
  survey_responses, surveys,
  qna_upvotes, qna_questions, qna_boards,
  poll_votes, polls,
  scores, questions, users CASCADE;

CREATE TABLE users (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(100),
  email VARCHAR(150) UNIQUE,
  role  TEXT CHECK (role IN ('teacher','student'))
);

CREATE TABLE questions (
  id            SERIAL PRIMARY KEY,
  question      TEXT NOT NULL,
  options       JSONB NOT NULL,
  correctanswer VARCHAR(255) NOT NULL,
  category      VARCHAR(50) NOT NULL
);

CREATE TABLE scores (
  id         SERIAL PRIMARY KEY,
  user_id    INT,
  category   VARCHAR(50),
  score      INT,
  time_taken INT
);

CREATE TABLE polls (
  id         SERIAL PRIMARY KEY,
  question   VARCHAR(255) NOT NULL,
  options    JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE poll_votes (
  id           SERIAL PRIMARY KEY,
  poll_id      INT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_index INT NOT NULL,
  voter_token  VARCHAR(36) NOT NULL,
  created_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE (poll_id, voter_token)
);
CREATE INDEX idx_poll_votes ON poll_votes(poll_id);

CREATE TABLE qna_boards (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  owner_token VARCHAR(36) NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE qna_questions (
  id           SERIAL PRIMARY KEY,
  board_id     INT NOT NULL REFERENCES qna_boards(id) ON DELETE CASCADE,
  text         VARCHAR(500) NOT NULL,
  author_token VARCHAR(36) NOT NULL,
  answered     SMALLINT NOT NULL DEFAULT 0,
  created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_qna_board ON qna_questions(board_id);

CREATE TABLE qna_upvotes (
  id          SERIAL PRIMARY KEY,
  question_id INT NOT NULL REFERENCES qna_questions(id) ON DELETE CASCADE,
  voter_token VARCHAR(36) NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE (question_id, voter_token)
);

CREATE TABLE surveys (
  id         SERIAL PRIMARY KEY,
  question   VARCHAR(255) NOT NULL,
  mode       TEXT NOT NULL DEFAULT 'rating' CHECK (mode IN ('rating','text')),
  scale      INT NOT NULL DEFAULT 5,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE survey_responses (
  id              SERIAL PRIMARY KEY,
  survey_id       INT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  rating          INT,
  text_answer     VARCHAR(1000),
  responder_token VARCHAR(36) NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE (survey_id, responder_token)
);
CREATE INDEX idx_survey ON survey_responses(survey_id);

CREATE TABLE wordclouds (
  id         SERIAL PRIMARY KEY,
  prompt     VARCHAR(255) NOT NULL,
  max_words  INT NOT NULL DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE wordcloud_entries (
  id              SERIAL PRIMARY KEY,
  wordcloud_id    INT NOT NULL REFERENCES wordclouds(id) ON DELETE CASCADE,
  word            VARCHAR(64) NOT NULL,
  submitter_token VARCHAR(36) NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_wc ON wordcloud_entries(wordcloud_id);

CREATE TABLE presentations (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  owner_token   VARCHAR(36) NOT NULL,
  current_index INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE presentation_slides (
  id              SERIAL PRIMARY KEY,
  presentation_id INT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  position        INT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('info','poll','word_cloud','survey')),
  ref_id          INT,
  config          JSONB
);
CREATE INDEX idx_pres ON presentation_slides(presentation_id);

CREATE TABLE quizzes (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(255) NOT NULL,
  category   VARCHAR(50) NOT NULL,
  created_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE quiz_questions (
  id          SERIAL PRIMARY KEY,
  quiz_id     INT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  position    INT NOT NULL DEFAULT 0,
  UNIQUE (quiz_id, question_id)
);

CREATE TABLE quiz_attempts (
  id         SERIAL PRIMARY KEY,
  quiz_id    INT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  name       VARCHAR(80) NOT NULL,
  score      INT NOT NULL,
  total      INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_qa_quiz ON quiz_attempts(quiz_id);
