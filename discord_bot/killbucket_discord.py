import requests
import aiohttp
import os
import matplotlib.pyplot as plt
import discord
import random
import yfinance as yf
import logging
from dotenv import load_dotenv

plt.rcdefaults()
color = 'darkgray'
plt.rc('font', weight='bold')
plt.rcParams['text.color']=color
plt.rcParams['axes.labelcolor']=color
plt.rcParams['xtick.color']=color
plt.rcParams['ytick.color']=color
#plt.figure(figsize=(45,30))
plt.rc('axes',edgecolor=color)
from keep_alive import keep_alive

load_dotenv()
TOKEN = os.getenv('DISCORD_TOKEN')
MIN_KILLS_IN_DAYS = int(os.getenv('MIN_KILLS_IN_DAYS'))
API_BASE_URL = os.getenv('API_BASE_URL')
API_USER=os.getenv('API_USER')
API_PASS=os.getenv('API_PASS')

logging.basicConfig(level=logging.DEBUG)
intents = discord.Intents.default()
intents.message_content = True
client = discord.Client(intents=intents)

def stonks(ticker):
  try:
    tickerData = yf.Ticker(ticker)
    tickerDf = tickerData.history(period='1d')
    return round(tickerDf['Close'][0],4)
  except:
    return 'error'
  


def killboard():
  """
  #open the current leaderboard json
  with open('json-weekly.txt','r') as infile:
    leaderboard = json.load(infile)
  string = ''
  #build the message
  for bucket in leaderboard.keys():
    string += f'**{bucket.capitalize()}:**\n'
    for place, data in leaderboard[bucket].items():
        string += f':{place}_place: {data["pilotname"]} - {data["count"]}\n'
    string += '\n'
  return string
  """
  return "Not implemented."

def char_id_lookup(char_name):
    try:
      logging.debug('Looking up id for ' + char_name)
      pull_url = "https://esi.evetech.net/latest/universe/ids/?datasource=tranquility&language=en"
      myobj = [char_name]
      resp = requests.post(pull_url, json = myobj)
      data = resp.json()
      logging.debug('Returning id ' + str(data['characters'][0]['id']) + ' for ' + char_name)
      return data['characters'][0]['id']
    except Exception as e:
        logging.error('Error looking up char name ' + char_name, e)

async def get_buckets(zkill_id):
    char_id = zkill_id 
    #input("Enter your character id from zkill: ")
    # set up initial webpage hit
    try:
        link = API_BASE_URL + "/character/" + str(char_id)
        async with aiohttp.ClientSession() as session:
          async with session.get(link,auth=aiohttp.BasicAuth(user, password)) as r:
            if r.status == 200:
                js = await r.json()
                return js['kills']['pilots_involved']
    except Exception as e:
        logging.error('Error getting buicks for ' + str(zkill_id), e)

#setup initial login
phrases = ['You are probably a filthy blobber, we\'ll see.','Small gang best gang.','Backpacks dont\'t count.','Strix Ryden #2!','I miss offgrid links.','You and 4 alts is BARELY solo.','Damn Pyfa warriors']
smallgang_phrases=['Did you wear your mouse out clicking in space?','What\'s an anchor and why do I need one?','We don\'t need no stinking FC.','Kitey nano bitch.','How many backpacks do you lose?','Wormholer BTW','Don\'t forget your HG snake pod','You\'d be even more elite with some purple on that ship.']
blobber_phrases=['FC when do I hit F1?','FC can I bring my drake?','Who is the anchor?','How\'s that blue donut treating you?','You must be part of some nullsec alliance.','You\'ve never heard of a nanofiber have you.','My sky marshall said stay docked.','I bet youve got the record in your alliance for station spin counter though!']
midgang_phrases=['You should probably listen to <10 instead of TiS.', 'Well you tried, but you should try harder.', 'Guess you must be a response fleet whore','Probably an input broadcaster.','So you, your five friends each with 3 alts. Got it.']
@client.event
async def on_ready():
    logging.debug('We have logged in as {0.user}'.format(client))

#if !killbucket used then get the zkill id
@client.event
async def on_message(message):
    if message.author == client.user:
        return
    if message.content =='!bucketboard':
      await message.channel.send(killboard())

    if message.content.startswith('!stonks'):
      logging.debug('someone requested info on '+message.content[8:])
      await message.channel.send(message.content[8:]+ ' Current Price='+str(stonks(message.content[8:].strip())))

    if message.content.startswith('!linkkb'):
      kill_id = message.content[8:]
      text_link = 'https://zkillboard.com/character/{}/'
      try:
        text_link = text_link.format(char_id_lookup(kill_id))
        await message.channel.send(text_link)
      except:
        await message.channel.send('I\'m not sure who that is')
    
    if message.content.startswith('!teams'):
        names = message.content[7:]
        pilots = names.split(',')
        logging.debug(pilots)
        total_pilots = len(pilots)/2+1
        return_message=''
        if len(pilots)%2 == 1:
          pick = random.randrange(0,len(pilots))
          return_message='Referee:'+pilots[pick]+'\n'
          pilots.pop(pick)
          total_pilots = len(pilots)/2+1
        return_message = return_message+'1:\n'
        while len(pilots) > 0:
            pick = random.randrange(0,len(pilots))
            return_message += pilots[pick]+'\n'
            if len(pilots) == total_pilots:
              return_message += '\n2:\n'
              total_pilots = 0
            pilots.pop(pick)
        await message.channel.send(return_message)
    
    if message.content.startswith('!killbucket'):
      if message.content == '!killbucket help':
        await message.channel.send('Usage:Place zkillID (from URL on zkill.com) after !killbucket \n Calculates kills based on pilots involved for buckets for the most recent 200  kills\nSmall Gang - <10, Mid gang- 10>= kills<30, Blobber - >=30')
        logging.debug('someone asked for help')
      else:
        logging.debug('someone asked for kills for ' + message.content[12:])
        await message.channel.send(random.choice(phrases)+'\n This might take a minute...')
        kill_id = message.content[12:]
        dumb = False
        try:
          int_char_id = int(kill_id)
        except ValueError:
          try:
            int_char_id = float(kill_id)

          except ValueError:
            try:
              int_char_id = int(char_id_lookup(kill_id))
            except:
              dumb = True 

        if dumb == False:
          kills = await get_buckets(int_char_id) #assumes !killbucket_zkillid
          if kills == 'error':
              await message.channel.send('Something went wrong, probably invalid zkill ID')
              logging.debug('someone screwed up')
          else:
              #message_text = ''
              small_gang = kills['solo']+kills['five']+kills['ten']
              blob_gang = kills['forty']+kills['fifty']+kills['blob']
              mid_gang = kills['fifteen']+kills['twenty']+kills['thirty']
              marauder = kills['marauder']
              if max(kills, key=lambda key: kills[key]) =='solo':
                reaction_text = ' **' + kill_id +'- You don\'t have many friends do you?**'
              elif small_gang < blob_gang and mid_gang<blob_gang:
                reaction_text = random.choice(blobber_phrases) + '\n **' + kill_id +'- You\'re a blobber**'
              elif mid_gang>small_gang and mid_gang > blob_gang:
                reaction_text = random.choice(midgang_phrases) + '\n **' + kill_id +'- Almost...still not cool enough to be elitist**'
              elif marauder >= (kills['five']+kills['ten']) * .25:
                 reaction_text = random.choice(midgang_phrases) + '\n **' + kill_id +'- It appears you enjoy the marauder meta**'
              else:
                reaction_text = random.choice(smallgang_phrases) + '\n **' + kill_id +'- You\'re an elitist nano prick**'
              if sum(kills.values()) < MIN_KILLS_IN_DAYS:
                reaction_text = kill_id + ' you don\'t undock much do you'
              
              #pilots = kills.keys()
              pilots = ['solo','5','10','15','20','30','40','50','blob','M']
              number = kills.values()
              plt.bar(pilots, number, align='center', alpha=0.5,color=color)
              plt.ylabel('Number of Kills')
              plt.title('Involved Pilots per KM for zkillID:'+kill_id,color=color)
              fig1=plt.gcf()
              #plt.show()
              fig1.savefig(fname='plot.png',transparent=True)
              plt.clf()
              await message.channel.send(file=discord.File('plot.png'), content = reaction_text)
              #await message.channel.send(reaction_text +'\n||Send isk to propeine in game||')
              #os.remove('plot.png')
        else:
          await message.channel.send('I don\'t know who you\'re talking about')
              
            
keep_alive()
client.run(TOKEN)          