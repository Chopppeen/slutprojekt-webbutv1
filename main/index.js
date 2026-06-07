// Appens tillstånd (sparas i localStorage mellan sidladdningar)
let cash = parseFloat(localStorage.getItem('cash')) || 10000
let holdings = JSON.parse(localStorage.getItem('holdings')) || {}
let currentPrice = 0
let currentSymbol = 'BTC' // vilken symbol som visas/handlas just nu
let lineSeries = null // chart-serie (LightweightCharts)
let currentChartData = null // cache för chart-data


// Namn för varje symbol (visningsnamn)
const assetInfo = {
    BTC: { name: "Bitcoin" },
    ETH: { name: "Ethereum" },
    SOL: { name: "Solana" },
    AAPL: { name: "Apple" },
    GOOGL: { name: "Google" },
    MSFT: { name: "Microsoft" }
}

// DOM-element som används för trading
// - `buy-btn` och `sell-btn`: knappar för köp/sälj
// - `shares-input`: inputfält där användaren anger antal enheter att handla
function updateWallet() {
    // Uppdatera plånboksvisning och spara nytt saldo
    const el = document.getElementById('cash')
    if (el) el.textContent = '$' + cash.toFixed(2)
    localStorage.setItem('cash', cash)
}

function showTradeError(message) {
    // Visa felmeddelande vid misslyckad handel
    const errorEl = document.getElementById('trade-error')
    const successEl = document.getElementById('trade-success')
    if (successEl) {
        successEl.classList.remove('show')
    }
    if (errorEl) {
        errorEl.textContent = message
        errorEl.classList.add('show')
        setTimeout(() => errorEl.classList.remove('show'), 3500)
    }
}

function showTradeSuccess(message) {
    // Visa bekräftelse vid lyckad handel
    const successEl = document.getElementById('trade-success')
    const errorEl = document.getElementById('trade-error')
    if (errorEl) {
        errorEl.classList.remove('show')
    }
    if (successEl) {
        successEl.textContent = message
        successEl.classList.add('show')
        setTimeout(() => successEl.classList.remove('show'), 2500)
    }
}

function validateTradeInput(shares) {
    // Enkel validering av användarens inskrivna antal
    if (!shares || isNaN(shares)) return 'Ange ett giltigt antal'
    if (shares <= 0) return 'Antal måste vara större än 0'
    return null
}

function formatTradeDate(value) {
    // Tar antingen en Date objekt eller en datumsträng, och formaterar till kort format
    const date = value instanceof Date ? value : new Date(value)
    if (isNaN(date)) return value
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    return `${day}/${month}-${year}`
}

const buyBtn = document.getElementById('buy-btn')
const sellBtn = document.getElementById('sell-btn')
// Köp / sälj-logik: hanterar knappklick för att skapa trades
if (buyBtn) {
    buyBtn.addEventListener('click', function() {
        const shares = parseFloat(document.getElementById('shares-input').value)
        const total = shares * currentPrice
        if (cash >= total) {
            cash -= total
            holdings[currentSymbol] = (holdings[currentSymbol] || 0) + shares
            localStorage.setItem('holdings', JSON.stringify(holdings))
            const trade = {
                symbol: currentSymbol,
                shares: shares,
                price: currentPrice,
                total: total,
                type: 'köpt',
                date: formatTradeDate(new Date()) // Sparar datum i kort format
            }
            const history = JSON.parse(localStorage.getItem('tradeHistory')) || []
            history.push(trade)
            localStorage.setItem('tradeHistory', JSON.stringify(history))
            updateWallet()
            updateHoldingsDisplay()
            showTradeSuccess(`Köpt ${shares} ${currentSymbol}`)
        } else {
            showTradeError(`Inte tillräckligt med pengar! Behövs $${total.toFixed(2)}`)
        }
    })
}

if (sellBtn) {
    sellBtn.addEventListener('click', function() {
        const shares = parseFloat(document.getElementById('shares-input').value)
        const owned = holdings[currentSymbol] || 0
        if (shares > owned) {
            showTradeError(`Du äger bara ${owned} ${currentSymbol}`)
            return
        }
        const total = shares * currentPrice
        cash += total
        holdings[currentSymbol] -= shares
        localStorage.setItem('holdings', JSON.stringify(holdings))
        const trade = {
            symbol: currentSymbol,
            shares: shares,
            price: currentPrice,
            total: total,
            type: 'sålt',
            date: formatTradeDate(new Date()) // Sparar datum i kort format
        }
        const history = JSON.parse(localStorage.getItem('tradeHistory')) || []
        history.push(trade)
        localStorage.setItem('tradeHistory', JSON.stringify(history))
        updateWallet()
        updateHoldingsDisplay()
        showTradeSuccess(`Sålt ${shares} ${currentSymbol}`)
    })
}

// Initial render av plånbok och innehav
updateWallet()
updateHoldingsDisplay()
// API-nycklar / externa tjänster
// OBS: i produktion bör nycklar inte ligga i direkt kod
const FINNHUB_KEY = 'd880de1r01qmhakhle3gd880de1r01qmhakhle40'

async function getStockPrice(symbol) {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`)
    const data = await res.json()
    // getStockPrice: returnerar aktuell sista trades-pris från Finnhub
    // `symbol` som t.ex. 'AAPL'. Returnerar ett nummer (pris i USD).
    return data.c
}

async function getCryptoPrices() {
    const res = await fetch('https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,SOL&tsyms=USD')
    const data = await res.json()
    // getCryptoPrices: hämtar flera kryptopris på en gång och returnerar ett objekt
    // med formatet { BTC: { USD: 12345.67 }, ETH: { USD: ... }, SOL: { USD: ... } }
    return data
}

async function updatePrices() {
    try {
        const crypto = await getCryptoPrices()
        if (document.getElementById('price-btc')) document.getElementById('price-btc').textContent = '$' + crypto.BTC.USD.toLocaleString()
        if (document.getElementById('price-eth')) document.getElementById('price-eth').textContent = '$' + crypto.ETH.USD.toLocaleString()
        if (document.getElementById('price-sol')) document.getElementById('price-sol').textContent = '$' + crypto.SOL.USD.toLocaleString()

        const aapl = await getStockPrice('AAPL')
        const googl = await getStockPrice('GOOGL')
        const msft = await getStockPrice('MSFT')
        if (document.getElementById('price-aapl')) document.getElementById('price-aapl').textContent = '$' + aapl.toLocaleString()
        if (document.getElementById('price-googl')) document.getElementById('price-googl').textContent = '$' + googl.toLocaleString()
        if (document.getElementById('price-msft')) document.getElementById('price-msft').textContent = '$' + msft.toLocaleString()
    } catch (err) {
        console.log('updatePrices fel:', err)
    }
}

// Uppdatera rubrik/etiketter för diagrammet när symbol ändras
function updateChartTitle(symbol) {
    currentSymbol = symbol

    const symbolEl = document.getElementById('chart-symbol')
    const nameEl = document.getElementById('chart-name')
    const titleEl = document.getElementById('chart-title')
    const assetName = assetInfo[symbol]?.name || symbol

    if (symbolEl) symbolEl.textContent = symbol
    if (nameEl) nameEl.textContent = assetName
    if (titleEl && !symbolEl && !nameEl) titleEl.textContent = `${symbol} — ${assetName}`
}

function updateHoldingsDisplay() {
    const holdingsInfo = document.getElementById('holdings-info')
    if (!holdingsInfo) return

    const amount = holdings[currentSymbol] || 0
    const formatted = Number(amount).toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 4 })
    holdingsInfo.textContent = `${formatted} ${currentSymbol}`
}

function updateChartDisplay(currentPrice, chartData) {
    const priceEl = document.getElementById('chart-price')
    const changeEl = document.getElementById('chart-change')
    
    if (!chartData || chartData.length === 0) return
    
    const firstClose = chartData[0].close
    const lastClose = chartData[chartData.length - 1].close
    const percentChange = ((lastClose - firstClose) / firstClose) * 100
    
    if (priceEl) {
        priceEl.textContent = '$' + currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    
    if (changeEl) {
        const changeText = percentChange >= 0 ? '+' : ''
        const changeColor = percentChange >= 0 ? '#0f9d58' : '#e63947'
        changeEl.textContent = changeText + percentChange.toFixed(2) + '%'
        changeEl.style.color = changeColor
    }
}

// Starta prisuppdatering i bakgrunden
updatePrices()
setInterval(updatePrices, 15000)
// Chart data
async function getChartData(symbol) {
    try {
        const res = await fetch(`https://min-api.cryptocompare.com/data/v2/histominute?fsym=${symbol}&tsym=USD&limit=1440`)
        const data = await res.json()
        if (!data.Data || !data.Data.Data) return []
        return data.Data.Data.map(d => ({
            time: d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
        }))
    } catch (err) {
        console.log('getChartData fel:', err)
        return []
    }
}

async function getStockChartData(symbol) {
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=12mo`
        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`)
        const data = await res.json()
        const result = data.chart.result[0]
        const timestamps = result.timestamp
        const quote = result.indicators.quote[0]
        return timestamps.map((time, i) => ({
            time: time,
            open: quote.open[i],
            high: quote.high[i],
            low: quote.low[i],
            close: quote.close[i],
        }))
    } catch (err) {
        console.log('getStockChartData fel:', err)
        return []
    }
}

async function loadChart(symbol, url) {
    const onCrypto = window.location.pathname.includes('crypto.html')
    const onStock = window.location.pathname.includes('stock.html')
    const cryptoSymbols = ['BTC', 'ETH', 'SOL']
    const stockSymbols = ['AAPL', 'GOOGL', 'MSFT']

    if (onCrypto && cryptoSymbols.includes(symbol)) {
        const data = await getChartData(symbol)
        currentChartData = data
        lineSeries.setData(data)
        const prices = await getCryptoPrices()
        currentPrice = prices[symbol]?.USD || 0
        updateChartDisplay(currentPrice, data)
        updateChartTitle(symbol)
        updateHoldingsDisplay()
        startCryptoStream(symbol)
    } else if (onStock && stockSymbols.includes(symbol)) {
        const data = await getStockChartData(symbol)
        currentChartData = data
        lineSeries.setData(data)
        currentPrice = await getStockPrice(symbol)
        updateChartDisplay(currentPrice, data)
        updateChartTitle(symbol)
        updateHoldingsDisplay()
    } else {
        sessionStorage.setItem('selectedSymbol', symbol)
        window.location.href = url
    }
}

setTimeout(async () => {
    const chartContainer = document.getElementById('chart-container')
    if (!chartContainer) return

    const chart = LightweightCharts.createChart(chartContainer, {
        width: chartContainer.offsetWidth,
        height: chartContainer.offsetHeight,
        layout: {
            background: { color: '#f0f8ff' },
            textColor: '#111',
        },
        grid: {
            vertLines: { color: '#d9e6f2' },
            horzLines: { color: '#d9e6f2' },
        },
        timeScale: {
            timeVisible: true,
            secondsVisible: false,
        },
    })

    lineSeries = chart.addCandlestickSeries({
        upColor: '#0f9d58',
        downColor: '#e63947',
        borderUpColor: '#0f9d58',
        borderDownColor: '#e63947',
        wickUpColor: '#0f9d58',
        wickDownColor: '#e63947',
    })

    const isCrypto = window.location.pathname.includes('crypto.html')
    const isStock = window.location.pathname.includes('stock.html')
    const defaultSymbol = isStock ? 'AAPL' : 'BTC'
    const symbol = sessionStorage.getItem('selectedSymbol') || defaultSymbol
    sessionStorage.removeItem('selectedSymbol')

    if (isStock) {
        const data = await getStockChartData(symbol)
        currentChartData = data
        lineSeries.setData(data)
        currentPrice = await getStockPrice(symbol)
        updateChartDisplay(currentPrice, data)
    } else {
        const data = await getChartData(symbol)
        currentChartData = data
        lineSeries.setData(data)
        const prices = await getCryptoPrices()
        currentPrice = prices[symbol]?.USD || 0
        updateChartDisplay(currentPrice, data)
    }
    updateChartTitle(symbol)
}, 500)

// WebSocket för realtidspris (Binance)
let ws = null
let currentCandle = null

function startCryptoStream(symbol) {
    if (ws) ws.close()

    ws = new WebSocket(
        `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}usdt@trade`
    )

    ws.onmessage = (event) => {
        const trade = JSON.parse(event.data)

        const price = parseFloat(trade.p)
        currentPrice = price

        const now = Math.floor(Date.now() / 1000)
        const candleTime = now - (now % 60)

        if (!currentCandle || currentCandle.time !== candleTime) {
            currentCandle = {
                time: candleTime,
                open: price,
                high: price,
                low: price,
                close: price
            }
        } else {
            currentCandle.high = Math.max(currentCandle.high, price)
            currentCandle.low = Math.min(currentCandle.low, price)
            currentCandle.close = price
        }

        lineSeries.update(currentCandle)
        
        updateChartDisplay(currentPrice, currentChartData)
    }
}
// Bygg tabell med handels-historik från localStorage
const tbody = document.getElementById('historik-body')
if (tbody) {
    const cash = parseFloat(localStorage.getItem('cash')) || 10000
    document.getElementById('cash').textContent = '$' + cash.toFixed(2)

    const history = JSON.parse(localStorage.getItem('tradeHistory')) || []
    const tomEl = document.getElementById('historik-tom')

    if (history.length === 0) {
        tomEl.style.display = 'block'
    } else {
        tomEl.style.display = 'none'
        history.reverse().forEach(trade => {
            const row = document.createElement('tr')
            row.innerHTML = `
                <td><strong>${trade.symbol}</strong></td>
                <td style="color: ${trade.type === 'köpt' ? '#16a34a' : '#dc2626'}; font-weight: 600">${trade.type}</td>
                <td>${trade.shares}</td>
                <td>$${trade.price.toLocaleString()}</td>
                <td>$${trade.total.toFixed(2)}</td>
                <td style="color: #94a3b8">${trade.date}</td>
`
            tbody.appendChild(row)
        })
    }
}

// Register / login - enkel klientbaserad autentisering (localStorage)
const authPages = {
    login: window.location.pathname.includes('login.html'),
    register: window.location.pathname.includes('register.html'),
    profile: window.location.pathname.includes('profil.html'),
    protected: ['index.html', 'crypto.html', 'stock.html', 'profil.html']
        .some(page => window.location.pathname.includes(page))
}

function getStoredUsers() {
    return JSON.parse(localStorage.getItem('users') || '[]')
}

// `users` lagras i localStorage som en array av objekt:
// [{ name, email, password, createdAt, image? }, ...]

function saveStoredUsers(users) {
    localStorage.setItem('users', JSON.stringify(users))
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser') || 'null')
}

// `currentUser` är en enkel sessionsmarkör sparad i localStorage.
// Den innehåller hela användarobjektet (inkl. namn, epost, ev. profilbild).

function setCurrentUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user))
}

function clearCurrentUser() {
    localStorage.removeItem('currentUser')
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidPassword(password) {
    return typeof password === 'string' && password.length >= 6
}

function showAuthMessage(el, message, type = 'error') {
    if (!el) return
    el.textContent = message
    el.classList.remove('error', 'success', 'show')
    el.classList.add(type, 'show')
}

function redirectToDashboard() {
    window.location.href = 'index.html'
}

function handleRegisterPage() {
    if (!authPages.register) return
    const nameInput = document.getElementById('reg-namn')
    const emailInput = document.getElementById('reg-email')
    const passwordInput = document.getElementById('reg-password')
    const errorEl = document.getElementById('reg-error')
    const successEl = document.getElementById('reg-success')
    const button = document.getElementById('reg-btn')

    if (getCurrentUser()) {
        redirectToDashboard()
        return
    }

    if (!button || !nameInput || !emailInput || !passwordInput) return

    button.addEventListener('click', function (event) {
        event.preventDefault()
        const name = nameInput.value.trim()
        const email = emailInput.value.trim().toLowerCase()
        const password = passwordInput.value

        if (!name || name.length < 2) {
            showAuthMessage(errorEl, 'Ange ditt namn med minst 2 tecken.', 'error')
            return
        }
        if (!isValidEmail(email)) {
            showAuthMessage(errorEl, 'Ange en giltig e-postadress.', 'error')
            return
        }
        if (!isValidPassword(password)) {
            showAuthMessage(errorEl, 'Lösenordet måste vara minst 6 tecken långt.', 'error')
            return
        }

        const users = getStoredUsers()
        if (users.some(user => user.email === email)) {
            showAuthMessage(errorEl, 'E-postadressen är redan registrerad.', 'error')
            return
        }

        const user = {
            name,
            email,
            password,
            createdAt: new Date().toISOString()
        }

        users.push(user)
        saveStoredUsers(users)
        setCurrentUser(user)
        showAuthMessage(successEl, 'Konto skapat! Du loggas in...', 'success')
        setTimeout(redirectToDashboard, 1200)
    })
}

function handleLoginPage() {
    if (!authPages.login) return
    const emailInput = document.getElementById('login-email')
    const passwordInput = document.getElementById('login-password')
    const errorEl = document.getElementById('login-error')
    const button = document.getElementById('login-btn')

    if (getCurrentUser()) {
        redirectToDashboard()
        return
    }

    if (!button || !emailInput || !passwordInput) return

    button.addEventListener('click', function (event) {
        event.preventDefault()
        const email = emailInput.value.trim().toLowerCase()
        const password = passwordInput.value

        if (!isValidEmail(email)) {
            showAuthMessage(errorEl, 'Ange en giltig e-postadress.', 'error')
            return
        }
        if (!password) {
            showAuthMessage(errorEl, 'Ange ditt lösenord.', 'error')
            return
        }

        const users = getStoredUsers()
        let user = users.find(u => u.email === email)

        // Fallback: stöd för äldre sparad nyckel 'user' (tidigare versioner)
        if (!user) {
            const legacy = JSON.parse(localStorage.getItem('user') || 'null')
            if (legacy && (legacy.email === email || legacy.namn === email) && legacy.password === password) {
                
                const migrated = {
                    name: legacy.name || legacy.namn || 'Användare',
                    email: legacy.email || (legacy.namn ? legacy.namn : ''),
                    password: legacy.password,
                    createdAt: new Date().toISOString()
                }
                users.push(migrated)
                saveStoredUsers(users)
                user = migrated
            }
        }

        if (!user || user.password !== password) {
            showAuthMessage(errorEl, 'Fel e-post eller lösenord.', 'error')
            return
        }

        setCurrentUser(user)
        showAuthMessage(errorEl, 'Inloggning lyckades!', 'success')
        setTimeout(redirectToDashboard, 900)
    })
}

function protectPages() {
    if (authPages.login || authPages.register) return
    if (!authPages.protected) return
    if (!getCurrentUser()) {
        window.location.href = 'login.html'
    }
}

function renderProfilePage() {
    if (!authPages.profile) return
    const user = getCurrentUser()
    if (!user) {
        window.location.href = 'login.html'
        return
    }

    // renderProfilePage fyller profilvyn med användarens data.
    // Förväntade element på sidan:
    // - `profil-namn`: element där användarens visningsnamn visas
    // - `profil-epost`: e-postadress
    // - `profil-medlem`: medlemsdatum
    // - `profil-avatar`: bild (uppdateras av updateProfileImageDisplay)
    // - `profil-image-input`: input för att ladda upp ny bild
    // - `historik-body`, `historik-tom`: handels-historik
    const nameEl = document.getElementById('profil-namn')
    const emailEl = document.getElementById('profil-epost')
    const memberEl = document.getElementById('profil-medlem')
    const logoutBtn = document.getElementById('logout-btn')
    const historyBody = document.getElementById('historik-body')
    const historyEmpty = document.getElementById('historik-tom')

    if (nameEl) nameEl.textContent = user.name
    if (emailEl) emailEl.textContent = user.email
    if (memberEl) {
        const date = new Date(user.createdAt)
        memberEl.textContent = `Medlem sedan ${date.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' })}`
    }

    updateProfileImageDisplay(user)
    attachProfileImageUpload()

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            clearCurrentUser()
            window.location.href = 'login.html'
        })
    }

    if (!historyBody || !historyEmpty) return
    const history = JSON.parse(localStorage.getItem('tradeHistory') || '[]')
    if (!history.length) {
        historyBody.innerHTML = ''
        historyEmpty.style.display = 'block'
        return
    }

    historyEmpty.style.display = 'none'
    historyBody.innerHTML = ''
    history.slice().reverse().forEach(item => {
        const row = document.createElement('tr')
        row.innerHTML = `
            <td>${item.symbol}</td>
            <td style="color: ${item.type === 'köpt' ? '#16a34a' : '#dc2626'}; font-weight: 600">${item.type}</td>
            <td>${item.shares}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>$${item.total.toFixed(2)}</td>
            <td>${formatTradeDate(item.date)}</td>
        `
        historyBody.appendChild(row)
    })
}

//profilbild Byte
function updateProfileImageDisplay(user) {
    const avatar = document.getElementById('profil-avatar')
    if (!avatar) return
    avatar.src = user.image || 'img/pfp-placeholder.png'
    avatar.alt = `${user.name}'s profilbild`
}

// updateProfileImageDisplay: sätter `src` på profilbildselementet.
// Bilden kommer från `user.image` och kan vara en data-URL (base64).

function attachProfileImageUpload() {
    const input = document.getElementById('profil-image-input')
    if (!input) return

    input.addEventListener('change', function () {
        const file = input.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) return
        if (file.size > 5 * 1024 * 1024) {
            alert('Vänligen välj en bild som är mindre än 5 MB.')
            return
        }

        const reader = new FileReader()
        reader.onload = function (event) {
            const imageData = event.target.result
            const user = getCurrentUser()
            if (!user) return
            user.image = imageData
            setCurrentUser(user)

            const users = getStoredUsers()
            const index = users.findIndex(u => u.email === user.email)
            if (index !== -1) {
                users[index].image = imageData
                saveStoredUsers(users)
            }

            updateProfileImageDisplay(user)
            updateProfileButton()
        }
        reader.readAsDataURL(file)
    })
}

// attachProfileImageUpload: läser vald fil som data-URL och sparar den
// i både `currentUser` och i `users`-listan. Begränsar filstorlek till 5 MB.

handleRegisterPage()
handleLoginPage()
protectPages()
renderProfilePage()

// profilknapp i navbar
function getUserInitials(user) {
    if (!user || !user.name) return 'U'
    return user.name
        .split(' ')
        .filter(Boolean)
        .map(part => part[0].toUpperCase())
        .slice(0, 2)
        .join('')
}

// getUserInitials: bygger initialer (max 2 bokstäver) för att visa i navbar

function updateProfileButton() {
    const profilKnapp = document.querySelector('.profil-knapp')
    if (!profilKnapp) return

    const user = getCurrentUser()
    if (user) {
        if (user.image) {
            profilKnapp.innerHTML = `<img src="${user.image}" alt="Profilbild">`
        } else {
            const initials = getUserInitials(user)
            profilKnapp.innerHTML = `<span class="profile-badge">${initials}</span>`
        }
        profilKnapp.onclick = () => window.location.href = 'profil.html'
    } else {
        profilKnapp.innerHTML = `<span class="login-text">Logga in</span>`
        profilKnapp.onclick = () => window.location.href = 'login.html'
    }
}

// updateProfileButton: uppdaterar profilknappen i navbaren.
// Visar profilbild om användaren har en, annars initialer. Knappen navigerar
// till `profil.html` om inloggad, eller `login.html` annars.

updateProfileButton()

// Körs på sidladdning för att initiera profil-knappens utseende/beteende
