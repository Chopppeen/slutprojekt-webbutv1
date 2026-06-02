let cash = parseFloat(localStorage.getItem('cash')) || 10000
let holdings = JSON.parse(localStorage.getItem('holdings')) || {}
let currentPrice = 0
let currentSymbol = 'BTC'
let lineSeries = null
let currentChartData = null

const assetInfo = {
    BTC: { name: "Bitcoin" },
    ETH: { name: "Ethereum" },
    SOL: { name: "Solana" },
    AAPL: { name: "Apple" },
    GOOGL: { name: "Google" },
    MSFT: { name: "Microsoft" }
}

function updateWallet() {
    document.getElementById('cash').textContent = '$' + cash.toFixed(2)
    localStorage.setItem('cash', cash)
}

function showTradeError(message) {
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
    if (!shares || isNaN(shares)) return 'Ange ett giltigt antal'
    if (shares <= 0) return 'Antal måste vara större än 0'
    return null
}

const buyBtn = document.getElementById('buy-btn')
const sellBtn = document.getElementById('sell-btn')

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
                date: new Date().toLocaleDateString('sv-SE')
            }
            const history = JSON.parse(localStorage.getItem('tradeHistory')) || []
            history.push(trade)
            localStorage.setItem('tradeHistory', JSON.stringify(history))
            updateWallet()
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
            date: new Date().toLocaleDateString('sv-SE')
        }
        const history = JSON.parse(localStorage.getItem('tradeHistory')) || []
        history.push(trade)
        localStorage.setItem('tradeHistory', JSON.stringify(history))
        updateWallet()
        showTradeSuccess(`Sålt ${shares} ${currentSymbol}`)
    })
}

updateWallet()

const FINNHUB_KEY = 'd880de1r01qmhakhle3gd880de1r01qmhakhle40'

async function getStockPrice(symbol) {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`)
    const data = await res.json()
    return data.c
}

async function getCryptoPrices() {
    const res = await fetch('https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,SOL&tsyms=USD')
    const data = await res.json()
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

updatePrices()
setInterval(updatePrices, 15000)

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
        startCryptoStream(symbol)
    } else if (onStock && stockSymbols.includes(symbol)) {
        const data = await getStockChartData(symbol)
        currentChartData = data
        lineSeries.setData(data)
        currentPrice = await getStockPrice(symbol)
        updateChartDisplay(currentPrice, data)
        updateChartTitle(symbol)
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
        
        // Update chart display with current price and chart data percentage
        updateChartDisplay(currentPrice, currentChartData)
    }
}

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