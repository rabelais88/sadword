# sadword

*this info is subject to change before heroku deploy

postgreSQL-db structure:

 - create table sw_article (article_id serial primary key, writer_ip inet, article_content varchar(200));
 - create table sw_score (score_id serial primary key, scorer_ip inet, score boolean not null, article_id integer references sw_article(article_id));
 - create table sw_comment (comment_id serial primary key, commenter_ip inet, comment_content varchar(150));
