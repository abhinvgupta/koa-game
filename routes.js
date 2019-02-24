const koaRouter = require('koa-router');
const fs = require('fs')
const crypto = require('crypto')

const { createReadStream } = fs

const router = new koaRouter()

// root html 
router.get('/', async ctx => {
	const rootPath = path.join(__dirname, 'views/index.html')
	ctx.type = 'html';
  // ctx.body = createReadStream('index.html');
  ctx.body = createReadStream(rootPath);
})

const genRandomString = (length) => {
    return crypto.randomBytes(Math.ceil(length/2))
            .toString('hex') /** convert to hexadecimal format */
            .slice(0,length);   /** return required number of characters */
};

const hashPassword = (password, salt) => {
	var hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
  hash.update(password);
  var passwordHash = hash.digest('hex');
  return passwordHash;
}

const saltHashPassword = (userpassword) => {
    var salt = genRandomString(16); /** Gives us salt of length 16 */
    var passwordHash = hashPassword(userpassword, salt);
    return { salt, passwordHash }
}

const validateLoginParams = (params) => {
	const {username, password} = params
	if (!username || !password){
		throw new Error('Invalid Login Params')
	}
	if (password.length < 5) {
		throw new Error('Password length too short')
	}
}

const isValidSignupParams = (params) => {
	let isValid = false
	const {username, password, password2} = params
	if (username && password && password2 && password === password2){
		isValid = isValid || true
	}
	if (password.length < 5) {
		isValid = isValid && false
	}
	return isValid
}


const createUser = async (ctx ,userObj) => {
	const isExistingUser = await ctx.db.collection('users').count({username: userObj.username})
	if (isExistingUser) {
		return null
	}
	const result = await ctx.db.collection('users').insert(userObj)
  const username = result.ops[0].username

  return username
}

const getBodyParams = (context) => {
	return JSON.parse(Object.keys(context.request.body)[0])
}

router.post('/login', async (ctx, next) => {
	const params = getBodyParams(ctx)
	const {username, password} = params
	// TODO: add db fetch and validate logic
	// get username and password from db
	const user = await ctx.db.collection('users').findOne({username})
	if (!user) {
		ctx.body = {error: 'User not found'} 
		return next()
	}
	// create hash of user entered password with stored salt
	const savedPassword = user.password

	if (!savedPassword || !savedPassword.salt) {
		ctx.body = {error: "Password not found"}
		return next()
	}
	const savedSalt = savedPassword.salt
	const inputPasswordHash = hashPassword(password, savedSalt)
	// validate hash
	if (inputPasswordHash == savedPassword.hash) {
		const highScore = user.highScore || 0
		ctx.body = {name: user.username, highScore}
	} else {
		ctx.body = {error: "Username and password dont match"}
	}
	// validate hashed password
	return next()
})

router.post('/signup', async (ctx, next) => {
	const params = getBodyParams(ctx)
	const {username, password} = params
	// validate params
	if (!isValidSignupParams(params)) {
		ctx.body = {error: 'Invalid User Params'} 
		return next()
	}
	// generate password hash
	const { salt, passwordHash } = saltHashPassword(password);
	const userObj = {
		username,
		password: {salt, hash: passwordHash}
	}
	// create user document
	const name = await createUser(ctx, userObj)
	if (!name) {
		ctx.body = {error: 'User already exists'}
		return next()
	}
	ctx.status = 201
	ctx.body = { name }
	return next()
})

const getDateString = (dateObj) => {
	var month = dateObj.getUTCMonth() + 1; //months from 1-12
	var day = dateObj.getUTCDate();
	var year = dateObj.getUTCFullYear();

	return year + "/" + month + "/" + day
}

const validateUserAttempt = (userAttempts) => {
	const currentDate = new Date()
	const dateString = getDateString(currentDate);
	let attemptsCount = 0
	userAttempts.forEach((attempt) => {
		const {playedAt} = attempt;
		const attemptDateString = getDateString(playedAt);
		if (attemptDateString === dateString) {
			attemptsCount += 1
		}
	})
	if (attemptsCount >= 10) {
		return false
	} else {
		return true
	}
}

const updateUserScore = (username, score, ctx) => {
	const returnObj = {}
	return ctx.db.collection('users').findOne({username}).then((user) => {
		if (!user) { 
			returnObj.error = 'No User'
			return returnObj;
		}
		user.scores = user.scores || []
		const isValidAttempt = validateUserAttempt(user.scores)
		if (!isValidAttempt) {
			returnObj.error = 'max 10 attempts allowed in a day'
			return returnObj;
		}
		user.scores.push({score, playedAt: new Date()})

		user.highScore = user.highScore || 0
		if(score > user.highScore) {
			user.highScore = score;
		}
		return ctx.db.collection('users').save(user).then((res) => {
			const isUpdated = res.result.ok ? true: false
			if (isUpdated) {
				returnObj.user = user;
				return returnObj;
			}
		})
	})
}

router.post('/updateScore', async (ctx, next) => {
	const params = getBodyParams(ctx)
	const {username, score} = params;
	const response = await updateUserScore(username, score, ctx)
	if (response.user) {
		ctx.body = {highScore: response.user.highScore}
	} else if (response.error) {
		ctx.body = response;
	} else {
		ctx.body = {error: 'User Score Not Updated'}
	}

	return next()
})

module.exports = router
