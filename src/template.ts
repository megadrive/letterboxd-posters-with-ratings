export const template = `<html><head>

<style>
  body {
    margin: 0;
    padding: 0;
    width: 230px;
    height: 345px;
  }
  
  img {
    width: 230px;
    height: 345px;
  }

  #container {
    position: relative;
  }
  
  #rating {
    position: absolute;
    width: 230px;
    text-align: center;
    bottom: 0;
    left: 0;
    font-size: 1.1rem;
    font-weight: bold;
    background: rgba(0, 0, 0, 0.5);
    color: white;
  }
</style>

</head><body>
<div id="container">
  <img src="{{poster}}" />
  <span id="rating">{{rating}}</span>
</div>
</body></html>
`;
