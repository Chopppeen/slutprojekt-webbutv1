let cash = parseFloat(localStorage.getItem('cash')) || 10000
let holdings = JSON.parse(localStorage.getItem('holdings')) || {}
let currentPrice = 0
let lineSeries = null

function updateWallet() {
    document.getElementById('cash').textContent = '$' + cash.toFixed(2)
    localStorage.setItem('cash', cash)
}

document.getElementById('buy-btn').addEventListener('click', function() {
    const shares = parseFloat(document.getElementById('shares-input').value)
    const total = shares * currentPrice
    if (cash >= total) {
        cash -= total
        updateWallet()
    } else {
        alert('Inte tillräckligt med pengar!')
    }
})

document.getElementById('sell-btn').addEventListener('click', function() {
    const shares = parseFloat(document.getElementById('shares-input').value)
    const total = shares * currentPrice
    cash += total
    updateWallet()
})

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
        document.getElementById('price-btc').textContent = '$' + crypto.BTC.USD.toLocaleString()
        document.getElementById('price-eth').textContent = '$' + crypto.ETH.USD.toLocaleString()
        document.getElementById('price-sol').textContent = '$' + crypto.SOL.USD.toLocaleString()

        const aapl = await getStockPrice('AAPL')
        const googl = await getStockPrice('GOOGL')
        const msft = await getStockPrice('MSFT')
        document.getElementById('price-aapl').textContent = '$' + aapl.toLocaleString()
        document.getElementById('price-googl').textContent = '$' + googl.toLocaleString()
        document.getElementById('price-msft').textContent = '$' + msft.toLocaleString()
    } catch (err) {
        console.log('updatePrices fel:', err)
    }
}

function updateChartTitle(symbol) {
    const title = document.getElementById('chart-title')
    if (title) {
        title.textContent = symbol
    }
}

updatePrices()

async function getChartData(symbol) {
    try {
        const res = await fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=30`)
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
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`
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
        lineSeries.setData(data)
        updateChartTitle(symbol)
    } else if (onStock && stockSymbols.includes(symbol)) {
        const data = await getStockChartData(symbol)
        lineSeries.setData(data)
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
    const symbol = sessionStorage.getItem('selectedSymbol') || (isCrypto ? 'BTC' : isStock ? 'AAPL' : 'BTC')
    sessionStorage.removeItem('selectedSymbol')
    updateChartTitle(symbol)

    const data = (isCrypto || (!isCrypto && !isStock)) ? await getChartData(symbol) : await getStockChartData(symbol)
    lineSeries.setData(data)
}, 500)