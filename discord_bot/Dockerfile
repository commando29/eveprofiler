FROM python:3
RUN mkdir -p /usr/src/bot
COPY ./discord_bot/requirements.txt /usr/src/bot/requirements.txt
WORKDIR /usr/src/bot
RUN pip install -r requirements.txt
COPY ./discord_bot .
WORKDIR /usr/src/bot
CMD [ "python3", "killbucket_discord.py" ]