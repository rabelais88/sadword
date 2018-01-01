# T.T - project sadword

*this info is subject to change before heroku deploy

postgreSQL-db structure:

 - create table sw_article (article_id serial primary key, writer_ip inet, article_content varchar(200), article_time timestamp, article_password varchar(15), article_score integer); <-- this article score exists for SUM. 
 - create table sw_score (score_id serial primary key, scorer_ip inet, score boolean not null, article_id integer references sw_article(article_id));
 - create table sw_comment (comment_id serial primary key, commenter_ip inet, article_id integer references sw_article(article_id), comment_content varchar(150));

note:
 - npm 'pg' is very verbose. always stick to 'pg-promise' unless it's necessary.
 - db structure should be planned ahead on note, so that later alteration is not necessary.
 - never forget to include gitignore...it is real pain in the ass.
