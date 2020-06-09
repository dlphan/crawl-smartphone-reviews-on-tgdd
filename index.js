const axios = require('axios')
const fs = require('fs')
const jsdom = require("jsdom")
const { JSDOM } = jsdom

const rootLink = 'https://www.thegioididong.com'
const LINK_MAX = 6
const PAGE_MAX = 20

const crawlData = async () => {
  const listUrl = []

  const links = Array.from(
    { length: LINK_MAX },
    (_, i) => axios({
      method: 'post',
      url: 'https://www.thegioididong.com/aj/CategoryV6/Product/',
      data: {
        Category: 42,
        Manufacture: 0,
        PriceRange: 0,
        Feature: 0,
        Property: 0,
        OrderBy: 0,
        PageSize: 30,
        PageIndex: i,
        Others: undefined,
        FeatureProduct: 0,
        ClearCache: 0
      }
    })
  )

  await axios
    .all(links)
    .then(axios.spread((...responses) => {
			const list2D = responses.map(({ data }) => {
        const dom = new JSDOM(data)
        const listUrlHtml = dom.window.document.querySelectorAll('.item a')
        listUrlHtml.forEach(function(url) {
          listUrl.push(rootLink + url.href)
        })

        return listUrl
			}).filter(list => list.length > 0)

			const list = [].concat(...list2D)
			return list
    }))

  const productLinks = Array.from(new Set(listUrl))
  // ====================================================================
  const listPositive =[]
  const listNegative =[]

  productLinks.forEach(async (productLink, index) => {
    setTimeout(async () => {
      requestFromLinks = Array.from(
        {length: PAGE_MAX },
        (_, i) => axios.get(`${productLink}/danh-gia?p=${i+1}`)
      )
    
      const reviews = await axios
        .all(requestFromLinks)
        .then(axios.spread((...responses) => {
          const list2D = responses.map(rs => {
            const dom = new JSDOM(rs.data)
            const comments = dom.window.document.querySelectorAll('.ratingLst .par i')
            const stars = dom.window.document.querySelectorAll('.ratingLst .par .rc span')
            const listComment = []
            const listStar = []
            
            stars.forEach(star => {
              const totalStar = star.querySelectorAll('.iconcom-txtstar').length
              listStar.push(totalStar)
            })
    
            comments.forEach(element => {
              if (element.textContent) listComment.push(element.textContent)
            })
            
            return listComment.map((comment, i) => {
              const cmt = comment.replace('\n', '')
              return {
                review: cmt,
                star: listStar[i]
              }
            })
          }).filter(list => list.length > 0)
          
          const list = [].concat(...list2D)
          return {
            list_positive: list.filter(cmt => cmt.star >= 4),
            list_negative: list.filter(cmt => cmt.star < 4)
          }
        }))
        .catch(err => {
          throw err
        })
      
      listPositive.push(reviews.list_positive)
      listNegative.push(reviews.list_negative)

      const listP = [].concat(...listPositive)
      const listN = [].concat(...listNegative)

      console.log(productLink, 'position: ',index, '==== Positive: ', listP.length,' - Negative: ', listN.length)

      fs.writeFileSync('./data/positiveReviews.json', JSON.stringify(listP), 'utf-8')
      fs.writeFileSync('./data/negativeReviews.json', JSON.stringify(listN), 'utf-8')
    }, 30000 * index)
  })
}

crawlData()
