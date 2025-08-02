  Документация API body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f9; color: #333; } header { background-color: #333; color: white; padding: 20px; text-align: center; } h1 { margin: 0; } .content { max-width: 900px; margin: 20px auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); } h2 { color: #333; } pre { background-color: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; font-family: 'Courier New', Courier, monospace; border: 1px solid #ddd; } .note { background-color: #ffecb3; padding: 10px; border-radius: 5px; margin-bottom: 20px; } .example { background-color: #e9f7f7; padding: 10px; border-radius: 5px; margin-bottom: 20px; } .parameters-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; } .parameters-table th, .parameters-table td { padding: 8px 12px; border: 1px solid #ddd; text-align: left; } .parameters-table th { background-color: #f2f2f2; }

Документация API
================

Получение данных через API
--------------------------

Вы можете получать данные автоматически, используя API. Для этого вам нужно в боте написать команду /api и получить свой персональный токен. Изначально на нём будет 100 бесплатных запросов, которые позволят протестировать систему. Когда они закончатся, начнут тратиться деньги с вашего баланса.

Цена запроса зависит от типа запроса и от указанного лимита поиска. По умолчанию лимит равен 100, при таком лимите большинство запросов будут стоить 0.003$.

Формула расчёта цены в долларах следующая:

    (5 + sqrt(Limit * Complexity)) / 5000

*   Limit — это лимит поиска, указанный вами (например, 100).
*   Complexity — параметр, отражающий количество единичных поисков, которые необходимо выполнить для вашего запроса.

Если запрос состоит из нескольких слов, то они ищутся во всех возможных перестановках, а поэтому сложность зависит от количества слов в вашем запросе. Вот пример расчёта сложности:

*   1 слово: Complexity = 1
*   2 слова: Complexity = 5
*   3 слова: Complexity = 16
*   Больше 3 слов: Complexity = 40

При этом следующие элементы не считаются словами:

*   Даты
*   Строки короче 4 символов
*   Числа короче 6 символов

Если вам нужно избежать деления запроса на слова по пробелам, используйте двойные кавычки для точного поиска, как описано ниже.

**Примечание:** Ограничение на частоту запросов с одного IP — 1 запрос в секунду. Если вам нужно выполнять больше запросов, вы можете объединять несколько запросов в один.

Параметры запроса
-----------------

Параметр

Описание

**'token'**

Токен, который вы получаете после выполнения команды `/api`.

**'request'**

Строка с вашим запросом либо массив строк с несколькими запросами.

**'limit'**

Лимит поиска (по умолчанию 100). Число от 100 до 10 000. Определяет количество возвращаемых результатов и диапазон поиска в базе.

**'lang'**

Код языка, на котором будут результаты запроса (по умолчанию `en`).

**'type'**

Тип отчёта: `json`, `short`, `html` (по умолчанию) `json`).

**'bot\_name'**

Имя бота в формате `@name` (необходимо указать, если бот не относится к основной группе зеркал).

Примеры запросов
----------------

**Пример 1:**

{"token":"987654321:b42vAQjW", "request":"google"}
        

**Пример 2:**

{"token":"987654321:b42vAQjW", "request":"Петя Иванов", "lang": "ru"}
        

**Пример 3:**

{"token":"987654321:b42vAQjW", "request":"example@gmail.com", "limit": 10}
        

**Пример 4:**

{"token":"987654321:b42vAQjW", "request":"Elon Reeve Musk", "limit": 100, "lang":"ru"}
        

**Пример 5:**

{"token":"987654321:b42vAQjW", "request":"example@gmail.com\\nElon Reeve Musk"}
        

**Пример 6:**

{"token":"987654321:b42vAQjW", "request":\["example@gmail.com","Elon Reeve Musk"\]}
        

Пример кода (Python)
--------------------

Пример использования API на языке Python:

import requests

data = {"token":"987654321:Vg41g0qY", "request":"test request", "limit": 100, "lang":"ru"}
url = 'https://leakosintapi.com/'
response = requests.post(url, json=data)
print(response.json())
        

**Обратите внимание:** Данные запроса отправляются в формате JSON. Если отправлять в виде параметров запроса, вы получите ошибку 501.

Пример телеграм-бота на основе API:

import requests
from random import randint
try:
    import telebot
    from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery
except ModuleNotFoundError:
    input("Нет нужной библиотеки. Выполните в командной строке команду: pip install pyTelegramBotAPI")

url = "https://leakosintapi.com/"
bot\_token = "" #Сюда вставьте токен, полученный от @BotFather
api\_token = ""  #Сюда вставьте токен, полученный от LeakOsint
lang = "ru"
limit = 300

#В этой функции можно проверять есть ли доступ у пользователя
def user\_access\_test(user\_id):
    return(True)

#Функция для генерации отчётов
cash\_reports = {}
def generate\_report(query, query\_id):
    global cash\_reports, url, bot\_token, api\_token, limit, lang
    data =  {"token":api\_token, "request":query.split("\\n")\[0\], "limit": limit, "lang":lang}
    response = requests.post(url, json=data).json()
    print(response)
    if "Error code" in response:
        print("Ошибка: "+response\["Error code"\])
        return(None)
    cash\_reports\[str(query\_id)\] = \[\]
    for database\_name in response\["List"\].keys():
        text = \[f"<b>{database\_name}</b>",""\]
        text.append(response\["List"\]\[database\_name\]\["InfoLeak"\]+"\\n")
        if database\_name!="No results found":
            for report\_data in response\["List"\]\[database\_name\]\["Data"\]:
                for column\_name in report\_data.keys():
                    text.append(f"<b>{column\_name}</b>:  {report\_data\[column\_name\]}")
                text.append("")
        text = "\\n".join(text)
        if len(text)>3500:
            text = text\[:3500\]+text\[3500:\].split("\\n")\[0\]+"\\n\\nНекоторые данные не поместились в это сообщение"
        cash\_reports\[str(query\_id)\].append(text)
    return(cash\_reports\[str(query\_id)\])

#Функция для создания инлайн-клавиатуры
def create\_inline\_keyboard(query\_id, page\_id, count\_page):
    markup = InlineKeyboardMarkup()
    if page\_id<0:
        page\_id=count\_page
    elif page\_id>count\_page-1:
        page\_id=page\_id%count\_page
    if count\_page==1:
        return markup
    markup.row\_width = 3
    markup.add(InlineKeyboardButton(text = "<<", callback\_data=f"/page {query\_id} {page\_id-1}"),
               InlineKeyboardButton(text = f"{page\_id+1}/{count\_page}", callback\_data="page\_list"),
               InlineKeyboardButton(text = ">>", callback\_data=f"/page {query\_id} {page\_id+1}"))
    return markup

bot = telebot.TeleBot(bot\_token)
@bot.message\_handler(commands=\["start"\])
def send\_welcome(message):
    bot.reply\_to(message, "Привет! Я телеграм-бот, который может искать по базам данных.", parse\_mode="Markdown")

@bot.message\_handler(func=lambda message: True)
def echo\_message(message):
    user\_id = message.from\_user.id
    if not(user\_access\_test(user\_id)):
        bot.send\_message(message.chat.id, "У вас нет доступа к боту")
        return()
    if message.content\_type == "text":
        query\_id = randint(0,9999999)
        report = generate\_report(message.text,query\_id)
        markup = create\_inline\_keyboard(query\_id,0,len(report))
        if report==None:
            bot.reply\_to(message, "Бот в данный момент не работает.", parse\_mode="Markdown")
        try:
            bot.send\_message(message.chat.id, report\[0\], parse\_mode="html", reply\_markup=markup) #, reply\_markup=markup
        except telebot.apihelper.ApiTelegramException:
            bot.send\_message(message.chat.id, text = report\[0\].replace("<b>","").replace("</b>",""), reply\_markup=markup)
        
@bot.callback\_query\_handler(func=lambda call: True)
def callback\_query(call: CallbackQuery):
    global cash\_reports
    if call.data.startswith("/page "):
        query\_id, page\_id = call.data.split(" ")\[1:\]
        if not(query\_id in cash\_reports):
            bot.edit\_message\_text(chat\_id=call.message.chat.id, message\_id=call.message.message\_id, text="Результаты запроса уже удалены")
        else:
            report = cash\_reports\[query\_id\]
            markup = create\_inline\_keyboard(query\_id,int(page\_id),len(report))
            try:
                bot.edit\_message\_text(chat\_id=call.message.chat.id, message\_id=call.message.message\_id, text=report\[int(page\_id)\], parse\_mode="html", reply\_markup=markup)
            except telebot.apihelper.ApiTelegramException:
                bot.edit\_message\_text(chat\_id=call.message.chat.id, message\_id=call.message.message\_id, text=report\[int(page\_id)\].replace("<b>","").replace("</b>",""), reply\_markup=markup)
while True:
    try:
        bot.polling()
    except:
        pass