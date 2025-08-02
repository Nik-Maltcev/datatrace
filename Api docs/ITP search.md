[Skip to content](https://itp-docs.pages.dev/endpoints/search/#search)

# Search

### Description

Search is a main endpoint and allows you searching data of InfoTrackPeople.

```md-code__content
POST /public-api/data/search

```

Warning

Header `x-api-key` should be added with your **API key**.

### Request body

Available search types:

| Type | Description | Examples |
| --- | --- | --- |
| `full_text` | Any type of text can be used | и.о. директора Суворов<br>51343452<br>ООО 'РосГаз' |
| `phone` | Phone numbers | +79225551234<br>7922421214 |
| `name` | Names (Name/Surname/Father's name).<br> It can be combined with birth date | Аникин Андрей Иванович<br> Аникин Андрей Иванович 1996-05-02 <br> Светлакова Светлана |
| `address` | Adress | улица Космонавтов, 12<br>г. Ростов, просп. Ленина, 1<br>Москва |
| `email` | Email | marinochkaa\_love@mail.ru<br>oleg@gmail.com |
| `plate_number` | Plate numbers | С202ВК977<br>A111ТВ732<br>С020РМ177 |
| `vin` | Vin codes | RUMKE8978DV154064<br>JMZMA18P200411817 |
| `passport` | Passports | 0805 542852<br>542852 |
| `snils` | SNILS | 11581339245<br>11952462764 |
| `inn` | INN | 250306888694<br>781075550363 |
| `username` | Telegram usernames. Should be sent without @ | oleg\_andreev<br>mashka202 |
| `password` | Passwords | mynewpassword2022<br>123456<br>qwerty333 |
| `telegram_id` | Telegram IDs | 5165691225<br>5027932016 |
| `tg_msg` | Telegram messages | Питер<br>Продам билеты на концерт<br>Жесть Белгород |

Body is `application/json`

```md-code__content
{
  "searchOptions":[\
    {\
    "type":"name",\
    "query":"Андрей"\
    }\
  ]
}

```

Tip

Search options also can be combined

```md-code__content
{
  "searchOptions":[\
    {\
    "type":"name",\
    "query":"Андрей"\
    },\
    {\
    "type":"phone",\
    "query":"7922421214"\
    }\
  ]
}

```

### Response body

Response is `application/json`:

Info

Detailed information on fields that are returned from API can be found [here](https://itp-docs.pages.dev/endpoints/fields/)

```md-code__content
{
    "data": {
        "База клиентов '2Gis'": {
            "data": [\
                {\
                    "data_provider": "v1",\
                    "db_name": "База клиентов '2Gis'",\
                    "name": "Андрей, магазин мужской одежды",\
                    "phone": "+79148364945",\
                    "address": "Улан-Удэ, 670000 Балтахинова, 15",\
                    "business_type": "Мужская одежда"\
                },\
                {\
                    "data_provider": "v1",\
                    "db_name": "База клиентов '2Gis'",\
                    "name": "Андрей, салон мужской одежды",\
                    "address": "Горно-Алтайск, 649000 Григория Чорос-Гуркина, 39/14",\
                    "business_type": "Мужская одежда"\
                },\
            ]
        },
        "ФССП": {
            "data": [\
                {\
                    "data_provider": "v2",\
                    "db_name": "ФССП",\
                    "name": "Ип Качанов Андрей Николаевич",\
                    "address": "Россия,301089,Тульская Обл,Чернский Р-Н, Кресты Д,Центральная Ул,32",\
                    "date_prootocol_end": "2019-12-16",\
                    "doc_number": "А68-6914/2019",\
                    "osp": "6834181",\
                    "claimant": "Публичное Акционерное Общество \"Ростелеком\"",\
                    "ie_number": "87625/19/71022-ИП"\
                },\
                {\
                    "data_provider": "v2",\
                    "db_name": "ФССП",\
                    "name": "Ип Деменков Андрей Анатольевич",\
                    "address": "Россия,156013,Костромская Обл, Кострома Г, Катушечная Ул,96, 1",\
                    "debt_total": "15000.00",\
                    "debt_balance": "0.00",\
                    "doc_number": "32244033200000081010",\
                    "osp": "9421293",\
                    "claimant": "Управление Федеральной Службы Судебных Приставов По Костромской Области",\
                    "ie_number": "16081/20/44033-ИП"\
                },\
            ]
        },
        "База Российского Союза Автостраховщиков 'Спектр' [2024]": {
            "data": [\
                {\
                    "is_vip": true,\
                    "data_provider": "Premium",\
                    "db_name": "База Российского Союза Автостраховщиков 'Спектр' [2024]"\
                }\
            ]
        }
    },
    "records": 5,
    "searchId": 1701
}

```

### Errors handling

Possible error statuses: `400`, `403`, `429`, `500`. Examples are given below:

[400](https://itp-docs.pages.dev/endpoints/search/#__tabbed_1_1)[403](https://itp-docs.pages.dev/endpoints/search/#__tabbed_1_2)[429](https://itp-docs.pages.dev/endpoints/search/#__tabbed_1_3)[500](https://itp-docs.pages.dev/endpoints/search/#__tabbed_1_4)

Tip

Please check if search types you're passing, are [correct](https://itp-docs.pages.dev/endpoints/search/#request-body)

```md-code__content
{
    "error": {
        "key": "searchOptions[0].type must be one of the following values: full_text, phone, name, address, email, plate_number, vin, passport, snils, inn, username, password, telegram_id, tg_msg",
        "param": "searchOptions[0].type",
        "message": "searchOptions[0].type must be one of the following values: full_text, phone, name, address, email, plate_number, vin, passport, snils, inn, username, password, telegram_id, tg_msg"
    }
}

```

Tip

![🙋‍♂️](https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/1f64b-200d-2642-fe0f.svg) Please contact [ITP Support](https://t.me/peopleoriginal_bot?start=) to renew your payment plan.

```md-code__content
{
    "error": {
        "key": "general.error.forbidden",
        "param": null,
        "message": "You API key is deactivated. Please contact support."
    }
}

```

Tip

![🙋‍♂️](https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/1f64b-200d-2642-fe0f.svg) Please contact [ITP Support](https://t.me/peopleoriginal_bot?start=) to increase your API limits.

```md-code__content
{
    "error": {
        "key": "general.error.limitExceeded",
        "param": null,
        "message": "You exceeded the limit of requests for this API key. Please contact support."
    }
}

```

Failure

Most probably we're already working on it. Please contact [ITP Support](https://t.me/peopleoriginal_bot?start=) to get status on the issue.

```md-code__content
{
    "error": {
        "key": "general.error.serverError",
        "message": "Something went wrong, please contact our support.",
    }
}

```