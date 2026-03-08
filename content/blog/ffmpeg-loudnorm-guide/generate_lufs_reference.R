targets <- data.frame(
  name = c("YouTube / Spotify", "Podcast", "TV放送"),
  value = c(-14, -16, -23),
  color = c("#D1495B", "#2E86AB", "#4F772D"),
  y = c(3.2, 2.1, 1.0),
  label_x = c(-13.7, -15.7, -21.2),
  stringsAsFactors = FALSE
)

output_path <- "lufs-reference.png"

if (.Platform$OS.type == "windows") {
  windowsFonts(Meiryo = windowsFont("Meiryo"))
}

png(
  filename = output_path,
  width = 1600,
  height = 760,
  res = 180,
  bg = "#FCFBF7"
)

op <- par(
  mar = c(2.2, 10.5, 2.2, 1.2),
  xaxs = "i",
  yaxs = "i",
  family = if (.Platform$OS.type == "windows") "Meiryo" else "sans"
)

plot.new()
plot.window(xlim = c(-25.1, 0.5), ylim = c(0.6, 3.95))

rect(-25.1, 0.6, 0.5, 3.95, col = "#FCFBF7", border = NA)

for (tick in seq(-24, 0, by = 2)) {
  segments(tick, 0.55, tick, 3.5, lwd = 1, col = "#E4DED1")
  text(tick, 0.35, labels = tick, cex = 1.0, col = "#5B554C")
}

for (i in seq_len(nrow(targets))) {
  y <- targets$y[i]
  value <- targets$value[i]
  color <- targets$color[i]

  segments(-24, y, 0, y, lwd = 10, col = "#E7E1D5")
  segments(-24, y, value, y, lwd = 10, col = color)
  points(value, y, pch = 21, bg = "white", col = color, cex = 2.2, lwd = 3)

  text(
    -24.2,
    y,
    labels = targets$name[i],
    adj = c(1, 0.5),
    cex = 1.05,
    font = 2,
    col = "#2F2A24",
    xpd = NA
  )

  text(
    targets$label_x[i],
    y + 0.23,
    labels = sprintf("%d LUFS", value),
    adj = c(0, 0.5),
    cex = 1.05,
    font = 2,
    col = color
  )
}

text(
  -24,
  4.1,
  labels = "LUFS基準の目安",
  adj = c(0, 0.5),
  cex = 1.55,
  font = 2,
  col = "#1F1A14"
)

text(
  -24,
  3.8,
  labels = "0 LUFS が最大。左に行くほど音量は小さくなります。",
  adj = c(0, 0.5),
  cex = 1.0,
  col = "#5B554C"
)

text(
  0,
  3.8,
  labels = "0 LUFS max",
  adj = c(1, 0.5),
  cex = 1.0,
  font = 2,
  col = "#1F1A14"
)

dev.off()
par(op)
