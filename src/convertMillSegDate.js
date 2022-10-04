import dayjs from "dayjs";

function convertMilisInDate(milisecunds) {
  const date = new Date(milisecunds);
  const d = new Date(date);
  let dateNoFormat =
    d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  const fomatDate = dayjs(dateNoFormat).format("YYYY-MM-DD");
  return fomatDate;
}

export default convertMilisInDate;
