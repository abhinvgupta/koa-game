const koa = require('koa');
const path = require('path')
const serve = require('koa-static')

const bodyParser = require('koa-bodyparser');
const router = require('./routes');
const mongo = require('koa-mongo');


const app = new koa()

app.use(serve('./views'))

// request body parser
app.use(bodyParser());

app.use(mongo({
  host: 'localhost',
  port: 27017,
  db: 'game',
  max: 100,
  min: 1,
}));


app.use(async (ctx, next)=>{
	console.log('in middle ware....')
  ctx.db === ctx.mongo.db('game')
	// add next
	await next()
})



// handle error
app.on('error', err => {
  console.log('server error', err)
});



app.use(router.routes()).use(router.allowedMethods())

app.listen(3000, () => console.log('Server started at port 3000'))