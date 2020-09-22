const Router = require('@koa/router');

const router = new Router({
  prefix: '/api',
});

router.get('/ping', async (ctx) => {
  const { response } = ctx;
  const responseBody = { message: 'Hello world!' };

  response.status = 200;
  response.body = responseBody;
});

module.exports = router;
