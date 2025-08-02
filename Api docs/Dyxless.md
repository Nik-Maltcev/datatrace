bnr-article-above-text-0

Стоимость одного запроса составляет 1.5₽.

Все запросы должны отсылаться на домен api-dyxless.cfd/{method}

Параметры принимаются в теле запроса.

## **Список методов:**

Отправка запросов идет методом POST. В ответ вы получаете JSON-объект, в котором основные поля:

- **status**(Boolean) \| Статус ответа, _true_ или _false._
- **counts**(Integer) \| Кол-во полученных записей.
- **data**(Array) \| Массив с найденными записями в базе.

### **/query**

Выполняет поиск по всем базам, в ответ возвращает кол-во найденных записей, и массив с полученными записями в формате JSON.

Принимает параметры:

- **token**(String) \| Токен из бота
- **query**(String) \| Поисковой запрос

Пример запроса:

```
const axios = require('axios');

let data = JSON.stringify({
  "query": "79877777777",
  "token": "**********-****-****-****-**********"
});

let config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://api-dyxless.cfd/query',
  headers: {
    'Content-Type': 'application/json'
  },
  data : data
};

axios.request(config)
.then((response) => {
  console.log(JSON.stringify(response.data));
})
.catch((error) => {
  console.log(error);
});
```

Пример успешного ответа:

```
{
    "status": true,
    "counts": 2
    "data": [...найденные записи]
}
```

[@dyxless\_channel](https://teletype.in/@dyxless_channel)

February 26, 22:19

10.4K views

3 reposts

Repost

Share

bnr-article-feed-0