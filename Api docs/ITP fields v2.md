[Skip to content](https://itp-docs.pages.dev/endpoints/v2_fields/#v2)

# v2

After moving to version 2, InfoTrackPeople increased the speed of returning data, it's quality and structure.
Version 2 doesn't have redundant fields, allows the product to add new sources quicker and in more efficient way.
Documentation for V2 is more complete, but still in process of improving and growing. So, stay tuned.

V2 has the same structure of required and optional fields. However, they're more structured and have defined data types.

### Required response fields:

```md-code__content
{
  "data_provider": "string",
  "email": "string",
  "name": "string",
  "phone": "string",
  "address": "string",
  "db_name": "string"
}

```

### Response structure

[Format](https://itp-docs.pages.dev/endpoints/v2_fields/#__tabbed_1_1)[Example](https://itp-docs.pages.dev/endpoints/v2_fields/#__tabbed_1_2)

```md-code__content
{
  "data_provider": "string",
  "db_name": "string",
  "name": "string",
  "email": "string",
  "phone": "string",
  "address": "string",
  "passport": "string",
  "relations": [\
      "string",\
  ],
  "sex": "integer",
  "birth_place": "string",
  "children": "boolean",
  "socials": [\
      {\
          "title": "string",\
          "id": "string",\
          "url": "string"\
      }\
  ],
  "educations": [\
      {\
          "title": "string",\
          "level": "integer",\
          "date": "string"\
      }\
  ],
  "works": [\
      {\
          "post": "string",\
          "company": "string",\
          "address": "string",\
          "date": "string"\
      }\
  ],
  "financials": [\
      {\
          "title": "string",\
          "card_number": "string",\
          "invoice_number": "string",\
          "login": "string",\
          "date": "string"\
      }\
  ],
  "ownerships": [\
      {\
          "title": "string",\
          "date": "string"\
      }\
  ],
  "links": [\
      {\
          "title": "string",\
          "url": "string"\
      }\
  ],
  "accounts": [\
      {\
          "title": "string",\
          "login": "string",\
          "password": "string",\
          "password_hash": "string",\
          "id": "string",\
          "client_card_number": "string",\
          "url": "string"\
      }\
  ],
  "incidences": [\
      {\
          "insurance": "string",\
          "date": "string",\
          "title": "string",\
          "participants": "string"\
      },\
  ],
  "devices": [\
      {\
          "title": "string",\
          "user_agent": "string",\
          "date": "string"\
      },\
  ],
  "ips": [\
      {\
          "ip": "string",\
          "date": "string"\
      },\
  ],
  "coordinates": [\
      "string"\
  ],
  "comment": "string",
  "vehicles": [\
      {\
          "type": "integer",\
          "color": "string",\
          "year": "integer",\
          "model": "string",\
          "vin": "string",\
          "plate_number": "string"\
      },\
  ],
  "documents": [\
      {\
          "authority": "string",\
          "country": "string",\
          "serial": "string",\
          "date_expire": "string",\
          "type": "integer",\
          "date_issue": "string"\
      },\
  ]
}

```

```md-code__content
{
  "data_provider": "v2",
  "db_name": "Тестовая База",
  "name": "Testovik Test Testovich; Тестовик Тест Тестович",
  "email": "emails@mail.com; someemail@gmail.com",
  "phone": "79222222222; 7900000000",
  "address": "с.Село, Уличная, д. 15, кв. 17; Город, Проспектная, д. 10, кв. 23",
  "passport": "2209432386",
  "relations": [\
      "Тестовик Тестовая Сергеевна 12.03.2000 Родственник",\
      "Тестовик Тест Андреевич 08.11.1955 Отец"\
  ],
  "sex": 1,
  "birth_place": "Россия, с.Село",
  "children": true,
  "socials": [\
      {\
          "title": "Telegram",\
          "id": "111111111",\
          "url": "link"\
      }\
  ],
  "educations": [\
      {\
          "title": "🇷🇺 Университет Спорта",\
          "level": 1,\
          "date": "20.20.2020 - 20.20.2022"\
      }\
  ],
  "works": [\
      {\
          "post": "Бармен",\
          "company": "Кофейня",\
          "address": "Россия, Алтайский край, с.Село",\
          "date": "14.20.2020 - 20.20.2020"\
      }\
  ],
  "financials": [\
      {\
          "title": "Банк",\
          "card_number": "1111111111111111",\
          "invoice_number": "0000000000000000",\
          "login": "222222333444",\
          "date": "11.2020 - 11.2025"\
      }\
  ],
  "ownerships": [\
      {\
          "title": "Дом",\
          "date": "10.11.2022"\
      }\
  ],
  "links": [\
      {\
          "title": "Профиль на сайте",\
          "url": "https://site.com"\
      }\
  ],
  "accounts": [\
      {\
          "title": "Профиль",\
          "login": "Login",\
          "password": "Password",\
          "password_hash": "Password hash",\
          "id": "A11111111",\
          "client_card_number": "11111111111111",\
          "url": "link"\
      }\
  ],
  "incidences": [\
      {\
          "insurance": "Компания Страховая",\
          "date": "10.11.2022",\
          "title": "ДТП",\
          "participants": "ФИО Honda Civic А000АА000; ФИО Rolls Royce A111АА111"\
      }\
  ],
  "devices": [\
      {\
          "title": "Телефон",\
          "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",\
          "date": "10.11.2022"\
      }\
  ],
  "ips": [\
      {\
          "ip": "00.00.111.11",\
          "date": "10.11.2022 14:20:00"\
      }\
  ],
  "coordinates": [\
      "00.00000, 11.11111"\
  ],
  "comment": "Комментарий",
  "vehicles": [\
      {\
          "type": 1,\
          "color": "Цвет",\
          "year": 2020,\
          "model": "Автомобиль",\
          "vin": "1234567890",\
          "plate_number": "С111АА111"\
      }\
  ],
  "documents": [\
      {\
          "authority": "Учреждение, что выдало",\
          "country": "🇷🇺",\
          "serial": "123456789",\
          "date_expire": "17.11.2027",\
          "type": 2,\
          "date_issue": "17.11.2022"\
      }\
  ]
}

```

### Fields description

#### ENUM

| Field | ENUM values |
| --- | --- |
| sex | 0 - female<br>1 - male |
| educations.level | 1 - Primary School<br>2 - Lower Secondary School<br>3 - Upper Secondary School<br>4 - Vocational Training<br>5 - Associate Degree<br>6 - Bachelor's Degree<br>7 - Master's Degree<br>8 - Doctoral Degree (PhD)<br>9 - Postdoctoral Fellowship<br>10 - Professional Certification<br>11 - Diploma |
| vehicles.type | 1 - car |
| documents.type | 0 - Passport<br>1 - INN (Taxpayer Identification Number)<br>2 - SNILS (Individual Insurance Account Number)<br>3 - Driver's License<br>4 - International Passport<br>5 - Birth Certificate<br>6 - Military ID<br>7 - Refugee Certificate<br>8 - Resident card (вид на жительство)<br>9 - Temporary Passport (временный паспорт который дают при утере)<br>10 - Seaman's passport<br>11 - Diplomatic passport<br>12 - Service passport(удостоверение) |